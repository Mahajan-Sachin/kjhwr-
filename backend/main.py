"""
main.py - FastAPI Service for UK Day-Ahead Wind Forecast Evaluation
Designed for Gridbricks Assessment.
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import elexon
import metrics

app = FastAPI(
    title="UK Wind Day-Ahead Forecast Evaluation API",
    description="Evaluates day-ahead wind generation forecasts against actuals from Elexon BMRS for January 2026.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """Health check endpoint for container and deployment monitoring."""
    return {
        "status": "healthy",
        "service": "UK Day-Ahead Wind Evaluator",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/available-dates")
def get_available_dates():
    """
    Returns valid date range for January 2026 challenge requirements.
    """
    dates = [f"2026-01-{day:02d}" for day in range(1, 32)]
    return {
        "dates": dates,
        "default": "2026-01-15",
        "description": "January 2026 delivery days for UK wholesale day-ahead trading."
    }


@app.get("/api/evaluate")
def evaluate_day_ahead(
    date: str = Query("2026-01-15", description="Delivery date in YYYY-MM-DD format"),
    resolution: str = Query("hourly", pattern="^(hourly|half_hourly)$", description="Data resolution: 'hourly' (24 pts) or 'half_hourly' (48 pts)"),
    cutoff_hour: int = Query(17, ge=0, le=23, description="Decision cut-off hour on Day D-1 (e.g. 12 for noon, 17 for 5pm)")
):
    """
    Evaluates forecast vs actual generation for the given date.
    Fetches FUELHH (actuals) & WINDFOR (forecasts) from Elexon BMRS,
    aligns timestamps, and computes quantitative accuracy metrics (MAE, RMSE, MAPE, Bias).
    """
    # 1. Validate Date format
    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format '{date}'. Please use YYYY-MM-DD."
        )

    # 3. Fetch data from Elexon (with automated file-cache)
    actuals = elexon.fetch_actual_wind(date)
    forecasts = elexon.fetch_forecast_wind(date)

    if not actuals or not forecasts:
        return {
            "success": False,
            "message": f"Unable to retrieve records from Elexon BMRS for {date}. Please try another date in January 2026.",
            "metrics": None,
            "data": []
        }

    # 4. Perform alignment and compute accuracy metrics
    result = metrics.align_and_evaluate(
        actual_records=actuals,
        forecast_records=forecasts,
        delivery_date=date,
        resolution=resolution,
        cutoff_hour=cutoff_hour
    )

    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
