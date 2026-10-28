"""
elexon.py - Data Fetching & Local Caching Module
Interacts with official Elexon BMRS API:
1. FUELHH: Half-hourly actual wind generation
2. WINDFOR: Wind generation forecasts

Includes local JSON caching to ensure ultra-fast responses
and avoid redundant external API calls.
"""

import os
import json
import requests
from datetime import datetime, timedelta

# Elexon BMRS Base API URL
BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

# Local cache directory
CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
os.makedirs(CACHE_DIR, exist_ok=True)


def _get_cache_path(dataset_name: str, date_str: str) -> str:
    """Returns the file path for cached dataset."""
    return os.path.join(CACHE_DIR, f"{dataset_name}_{date_str}.json")


def fetch_actual_wind(delivery_date: str) -> list:
    """
    Fetch actual wind generation from FUELHH dataset for a given delivery date (YYYY-MM-DD).
    Filters for fuelType == 'WIND'.
    """
    cache_file = _get_cache_path("actuals", delivery_date)

    # 1. Return from cache if already downloaded
    if os.path.exists(cache_file):
        with open(cache_file, "r") as f:
            return json.load(f)

    # 2. Build time boundaries for the delivery day (00:00:00Z to 23:59:59Z)
    from_time = f"{delivery_date}T00:00:00Z"
    to_time = f"{delivery_date}T23:59:59Z"

    url = f"{BASE_URL}/FUELHH/stream"
    params = {
        "publishDateTimeFrom": from_time,
        "publishDateTimeTo": to_time
    }
    headers = {"User-Agent": "Gridbricks-DayAhead-Evaluator/1.0"}

    try:
        try:
            response = requests.get(url, params=params, headers=headers, timeout=15)
        except requests.exceptions.SSLError:
            # Handle local Windows SSL proxy/cert issues gracefully
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            response = requests.get(url, params=params, headers=headers, timeout=15, verify=False)

        response.raise_for_status()
        raw_data = response.json()

        # Filter strictly for WIND fuelType
        wind_records = [
            {
                "startTime": item.get("startTime"),
                "publishTime": item.get("publishTime"),
                "settlementPeriod": item.get("settlementPeriod"),
                "generation": item.get("generation", 0)
            }
            for item in raw_data
            if item.get("fuelType") == "WIND"
        ]

        # Save valid data to cache
        if wind_records:
            with open(cache_file, "w") as f:
                json.dump(wind_records, f)

        return wind_records

    except Exception as e:
        print(f"Error fetching actuals for {delivery_date}: {e}")
        return []


def fetch_forecast_wind(delivery_date: str) -> list:
    """
    Fetch wind forecasts from WINDFOR dataset relevant for delivery_date.
    Includes Day-Ahead forecasts published on Day D-1 and Day D.
    """
    cache_file = _get_cache_path("forecasts", delivery_date)

    # 1. Return from cache if already downloaded
    if os.path.exists(cache_file):
        with open(cache_file, "r") as f:
            return json.load(f)

    # Calculate previous day (Day D-1)
    target_dt = datetime.strptime(delivery_date, "%Y-%m-%d")
    prev_dt = target_dt - timedelta(days=1)
    prev_date_str = prev_dt.strftime("%Y-%m-%d")

    # Fetch forecasts published from start of previous day to end of delivery day
    from_time = f"{prev_date_str}T00:00:00Z"
    to_time = f"{delivery_date}T23:59:59Z"

    url = f"{BASE_URL}/WINDFOR/stream"
    params = {
        "publishDateTimeFrom": from_time,
        "publishDateTimeTo": to_time
    }
    headers = {"User-Agent": "Gridbricks-DayAhead-Evaluator/1.0"}

    try:
        try:
            response = requests.get(url, params=params, headers=headers, timeout=15)
        except requests.exceptions.SSLError:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            response = requests.get(url, params=params, headers=headers, timeout=15, verify=False)

        response.raise_for_status()
        raw_data = response.json()

        # Keep relevant forecast records
        forecast_records = [
            {
                "startTime": item.get("startTime"),
                "publishTime": item.get("publishTime"),
                "generation": item.get("generation", 0)
            }
            for item in raw_data
        ]

        # Save to cache if data exists
        if forecast_records:
            with open(cache_file, "w") as f:
                json.dump(forecast_records, f)

        return forecast_records

    except Exception as e:
        print(f"Error fetching forecasts for {delivery_date}: {e}")
        return []
