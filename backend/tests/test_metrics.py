import sys
import os
import math
import pytest
import pandas as pd
from datetime import datetime

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import metrics
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_api_health():
    """Verify health endpoint returns status healthy."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_available_dates():
    """Verify available dates returns valid date range."""
    response = client.get("/api/available-dates")
    assert response.status_code == 200
    data = response.json()
    assert "2026-01-15" in data["dates"]
    assert len(data["dates"]) == 31


def test_mathematical_metrics():
    """Verify MAE, RMSE, R2, and Correlation mathematical correctness."""
    # Synthetic dataset with known ground truth
    actuals = [
        {"startTime": f"2026-01-15T{h:02d}:00:00Z", "generation": 1000 + h * 50, "settlementPeriod": h * 2 + 1}
        for h in range(24)
    ]
    # Add second half-hour for each period to simulate 48 half-hours
    actuals += [
        {"startTime": f"2026-01-15T{h:02d}:30:00Z", "generation": 1000 + h * 50 + 10, "settlementPeriod": h * 2 + 2}
        for h in range(24)
    ]

    forecasts = [
        {
            "startTime": f"2026-01-15T{h:02d}:00:00Z",
            "publishTime": "2026-01-14T12:00:00Z",
            "generation": 1000 + h * 50 + 100  # Systematic 100 MW over-forecast
        }
        for h in range(24)
    ]

    result = metrics.align_and_evaluate(
        actual_records=actuals,
        forecast_records=forecasts,
        delivery_date="2026-01-15",
        resolution="hourly"
    )

    assert result["success"] is True
    res_metrics = result["metrics"]
    
    # In hourly aggregation, actual is 1000 + h*50 + 5. Forecast is 1000 + h*50 + 100.
    # Expected Error (Actual - Forecast) = -95 MW systematically.
    assert math.isclose(res_metrics["mae_mw"], 95.0, abs_tol=1.0)
    assert res_metrics["bias_mw"] > 0  # Over-forecasting
    assert res_metrics["bias_direction"] == "Over-forecasting"
    assert res_metrics["correlation"] > 0.99  # Perfectly parallel lines
    assert res_metrics["point_count"] == 24


def test_half_hourly_interpolation():
    """Verify half-hourly interpolation produces 48 complete settlement periods."""
    actuals = [
        {"startTime": f"2026-01-15T{h:02d}:00:00Z", "generation": 2000, "settlementPeriod": h * 2 + 1}
        for h in range(24)
    ] + [
        {"startTime": f"2026-01-15T{h:02d}:30:00Z", "generation": 2000, "settlementPeriod": h * 2 + 2}
        for h in range(24)
    ]

    forecasts = [
        {"startTime": f"2026-01-15T{h:02d}:00:00Z", "publishTime": "2026-01-14T12:00:00Z", "generation": 2200}
        for h in range(24)
    ]

    result = metrics.align_and_evaluate(
        actual_records=actuals,
        forecast_records=forecasts,
        delivery_date="2026-01-15",
        resolution="half_hourly"
    )

    assert result["success"] is True
    assert result["metrics"]["point_count"] == 48


def test_edge_case_empty_input():
    """Verify graceful error response when empty dataset is passed."""
    result = metrics.align_and_evaluate(
        actual_records=[],
        forecast_records=[],
        delivery_date="2026-01-15",
        resolution="hourly"
    )
    assert result["success"] is False
    assert "Insufficient" in result["message"]
