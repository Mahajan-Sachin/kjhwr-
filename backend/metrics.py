"""
metrics.py - Forecasting Alignment & Quantitative Accuracy Evaluation
Provides:
1. Day-Ahead Forecast Pairing (selecting latest forecast before gate closure)
2. Method 1: Hourly Aggregation (averaging half-hours to match 24 hourly forecasts)
3. Method 2: Half-Hourly Linear Interpolation (interpolating hourly forecasts to match 48 settlement periods)
4. Evaluation Metrics: MAE, RMSE, MAPE, Bias, Max Shortfall/Surplus
"""

import math
import pandas as pd
from datetime import datetime, timedelta


def align_and_evaluate(actual_records: list, forecast_records: list, delivery_date: str, resolution: str = "hourly", cutoff_hour: int = 17) -> dict:
    """
    Aligns forecasts with actuals for delivery_date and computes error metrics.
    
    Parameters:
    - actual_records: Raw list of actual records from FUELHH
    - forecast_records: Raw list of forecast records from WINDFOR
    - delivery_date: String YYYY-MM-DD
    - resolution: 'hourly' (24 points) or 'half_hourly' (48 points)
    - cutoff_hour: Decision cutoff hour on Day D-1 (default: 17 = 5:00 PM UK time)
    """
    if not actual_records or not forecast_records:
        return {
            "success": False,
            "message": "Insufficient actual or forecast data for this date."
        }

    df_act = pd.DataFrame(actual_records)
    df_fc = pd.DataFrame(forecast_records)

    # Convert timestamps
    df_act['startTime'] = pd.to_datetime(df_act['startTime'])
    df_fc['startTime'] = pd.to_datetime(df_fc['startTime'])
    df_fc['publishTime'] = pd.to_datetime(df_fc['publishTime'])

    # 1. Filter Delivery Day data (target day)
    target_start = pd.to_datetime(f"{delivery_date}T00:00:00Z")
    target_end = pd.to_datetime(f"{delivery_date}T23:59:59Z")

    df_act = df_act[(df_act['startTime'] >= target_start) & (df_act['startTime'] <= target_end)]
    df_fc = df_fc[(df_fc['startTime'] >= target_start) & (df_fc['startTime'] <= target_end)]

    if df_act.empty or df_fc.empty:
        return {
            "success": False,
            "message": f"No data points found matching target date {delivery_date}."
        }

    # 2. Causality / Day-Ahead Cutoff Filter
    # Day-Ahead decisions are made on D-1 by cutoff_hour (e.g. 17:00 UTC)
    target_dt = datetime.strptime(delivery_date, "%Y-%m-%d")
    prev_day = (target_dt - timedelta(days=1)).strftime("%Y-%m-%d")
    cutoff_time = pd.to_datetime(f"{prev_day}T{cutoff_hour:02d}:00:00Z")

    # Pick forecasts published before or at cutoff time (with fallback to latest published before delivery)
    valid_fc = df_fc[df_fc['publishTime'] <= cutoff_time]
    if valid_fc.empty:
        # Graceful fallback: pick the latest forecast published before the delivery day started
        valid_fc = df_fc[df_fc['publishTime'] <= target_start]
        if valid_fc.empty:
            valid_fc = df_fc

    # For each startTime, pick the most recent (latest) forecast
    latest_fc = valid_fc.sort_values('publishTime').groupby('startTime').last().reset_index()

    # 3. Resolution Alignment
    if resolution == "hourly":
        # METHOD 1: Aggregate Actuals to Hourly (Average of two 30-min blocks)
        df_act['hour'] = df_act['startTime'].dt.floor('h')
        hourly_act = df_act.groupby('hour').agg({
            'generation': 'mean'
        }).reset_index().rename(columns={'hour': 'timestamp', 'generation': 'actual_mw'})

        latest_fc['timestamp'] = latest_fc['startTime'].dt.floor('h')
        hourly_fc = latest_fc.groupby('timestamp').agg({
            'generation': 'mean',
            'publishTime': 'last'
        }).reset_index().rename(columns={'generation': 'forecast_mw'})

        merged = pd.merge(hourly_act, hourly_fc, on='timestamp', how='inner')
        merged = merged.sort_values('timestamp')

    else:
        # METHOD 2: Interpolate Hourly Forecasts to 48 Half-Hourly Settlement Periods
        # Create a complete 48-period 30-minute timestamp range for delivery_date
        full_range = pd.date_range(start=target_start, periods=48, freq='30min', tz='UTC')
        grid_df = pd.DataFrame({'timestamp': full_range})

        # Merge actuals
        df_act = df_act.rename(columns={'startTime': 'timestamp', 'generation': 'actual_mw'})
        merged = pd.merge(grid_df, df_act[['timestamp', 'settlementPeriod', 'actual_mw']], on='timestamp', how='left')

        # Merge forecasts and linearly interpolate missing half-hours
        latest_fc = latest_fc.rename(columns={'startTime': 'timestamp', 'generation': 'forecast_mw'})
        merged = pd.merge(merged, latest_fc[['timestamp', 'forecast_mw', 'publishTime']], on='timestamp', how='left')

        merged['forecast_mw'] = merged['forecast_mw'].interpolate(method='linear').bfill().ffill()
        merged['actual_mw'] = merged['actual_mw'].bfill().ffill()

        if 'settlementPeriod' not in merged.columns or merged['settlementPeriod'].isnull().any():
            merged['settlementPeriod'] = list(range(1, len(merged) + 1))

    if merged.empty:
        return {
            "success": False,
            "message": "Alignment yielded zero matching records."
        }

    # 4. Error Calculations
    # Error = Actual - Forecast (Positive: Surplus / Wind generated more than forecast)
    # Negative: Shortfall / Wind generated less than forecast (penalty risk!)
    merged['error_mw'] = merged['actual_mw'] - merged['forecast_mw']
    merged['abs_error_mw'] = merged['error_mw'].abs()

    # Quantitative Metrics
    mae = float(merged['abs_error_mw'].mean())
    rmse = float(math.sqrt((merged['error_mw'] ** 2).mean()))
    
    # Normalized MAPE avoiding zero division
    avg_actual = merged['actual_mw'].mean()
    mape = float((merged['abs_error_mw'] / (merged['actual_mw'] + 1e-5)).mean() * 100) if avg_actual > 0 else 0.0
    nmae = float((mae / avg_actual) * 100) if avg_actual > 0 else 0.0

    # Bias: Mean error (Forecast - Actual). Positive means Over-forecasting on average.
    bias = float((merged['forecast_mw'] - merged['actual_mw']).mean())

    # R2 Score (Coefficient of Determination: 0 to 1 for good fits)
    ss_res = ((merged['actual_mw'] - merged['forecast_mw']) ** 2).sum()
    ss_tot = ((merged['actual_mw'] - avg_actual) ** 2).sum()
    r2_score = float(1.0 - (ss_res / (ss_tot + 1e-5))) if ss_tot > 0 else 0.0

    # Pearson Correlation Coefficient (r: -1 to +1, captures shape sync)
    corr = float(merged['actual_mw'].corr(merged['forecast_mw']))
    if math.isnan(corr):
        corr = 0.0

    # Peak metrics
    max_shortfall = float(merged['error_mw'].min())  # Most negative error
    max_surplus = float(merged['error_mw'].max())    # Most positive error
    total_actual_mwh = float(merged['actual_mw'].sum() * (1.0 if resolution == "hourly" else 0.5))
    total_forecast_mwh = float(merged['forecast_mw'].sum() * (1.0 if resolution == "hourly" else 0.5))

    # Format points for UI Chart and Table
    data_points = []
    for _, row in merged.iterrows():
        point = {
            "time": row['timestamp'].strftime("%H:%M"),
            "full_time": row['timestamp'].strftime("%Y-%m-%d %H:%M"),
            "actual_mw": round(float(row['actual_mw']), 1),
            "forecast_mw": round(float(row['forecast_mw']), 1),
            "error_mw": round(float(row['error_mw']), 1),
        }
        if 'settlementPeriod' in row and pd.notnull(row['settlementPeriod']):
            point["settlementPeriod"] = int(row['settlementPeriod'])
        data_points.append(point)

    return {
        "success": True,
        "date": delivery_date,
        "resolution": resolution,
        "metrics": {
            "mae_mw": round(mae, 1),
            "rmse_mw": round(rmse, 1),
            "r2_score": round(max(r2_score, -1.0), 3),
            "correlation": round(corr, 3),
            "mape_percent": round(min(mape, 100.0), 1),
            "nmae_percent": round(nmae, 1),
            "bias_mw": round(bias, 1),
            "bias_direction": "Over-forecasting" if bias > 0 else "Under-forecasting",
            "max_shortfall_mw": round(max_shortfall, 1),
            "max_surplus_mw": round(max_surplus, 1),
            "total_actual_mwh": round(total_actual_mwh, 0),
            "total_forecast_mwh": round(total_forecast_mwh, 0),
            "point_count": len(data_points)
        },
        "data": data_points
    }
