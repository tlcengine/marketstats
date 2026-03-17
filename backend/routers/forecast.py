"""Forecast API — historical price trend + linear regression forecast."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from db import get_db
from models.mls import fetch_listings, get_feed

router = APIRouter()

# Geo type -> RESO query field
_GEO_TYPE_MAP = {
    "County": "CountyOrParish",
    "City": "City",
    "PostalCode": "PostalCode",
    "Zip": "PostalCode",
}


def _linear_regression_forecast(
    dates: np.ndarray,
    values: np.ndarray,
    forecast_months: int = 12,
) -> dict:
    """
    Simple linear regression on monthly data.

    Returns dict with:
      - slope, intercept
      - forecast_dates, forecast_values
      - confidence_upper, confidence_lower (1 std-dev band)
    """
    n = len(dates)
    if n < 3:
        return {
            "forecast_dates": [],
            "forecast_values": [],
            "confidence_upper": [],
            "confidence_lower": [],
            "slope": 0,
            "intercept": float(values[-1]) if len(values) > 0 else 0,
        }

    # Use numeric x: 0, 1, 2, ... for each month
    x = np.arange(n, dtype=float)
    y = values.astype(float)

    # Least squares fit
    slope, intercept = np.polyfit(x, y, 1)

    # Residual standard error
    y_pred = slope * x + intercept
    residuals = y - y_pred
    se = np.std(residuals, ddof=2) if n > 2 else np.std(residuals)

    # Forecast future months
    last_date = dates[-1]
    forecast_x = np.arange(n, n + forecast_months, dtype=float)

    forecast_values = slope * forecast_x + intercept
    # Widen confidence band over time
    distance_factor = np.sqrt(1 + (forecast_x - np.mean(x)) ** 2 / np.sum((x - np.mean(x)) ** 2))
    margin = 1.96 * se * distance_factor

    forecast_dates = pd.date_range(
        start=last_date + pd.DateOffset(months=1),
        periods=forecast_months,
        freq="MS",
    )

    return {
        "forecast_dates": [d.strftime("%Y-%m") for d in forecast_dates],
        "forecast_values": [round(float(v), 2) for v in forecast_values],
        "confidence_upper": [round(float(v + m), 2) for v, m in zip(forecast_values, margin)],
        "confidence_lower": [round(float(max(v - m, 0)), 2) for v, m in zip(forecast_values, margin)],
        "slope": float(slope),
        "intercept": float(intercept),
    }


@router.get("/")
async def get_forecast(
    state: str = Query(..., description="State name"),
    geo_type: Optional[str] = Query(None, description="County, City, or PostalCode"),
    geo_values: Optional[str] = Query(None, description="Comma-separated geo values"),
    years: int = Query(5, ge=1, le=20, description="Years of historical data"),
    forecast_months: int = Query(12, ge=3, le=24, description="Months to forecast"),
    stat_type: str = Query("Median", description="Median or Average"),
):
    """Return historical median/average price + forecast with confidence bands."""
    try:
        feed = get_feed(state)
    except KeyError:
        raise HTTPException(404, f"No MLS feed for state: {state}")

    if not geo_type or not geo_values:
        raise HTTPException(400, "geo_type and geo_values are required")

    query_field = _GEO_TYPE_MAP.get(geo_type)
    if query_field is None:
        raise HTTPException(400, f"Invalid geo_type: {geo_type}")

    targets = [v.strip() for v in geo_values.split(",") if v.strip()]
    if not targets:
        raise HTTPException(400, "geo_values must contain at least one value")

    db = get_db()
    df = await fetch_listings(db, feed, query_field, targets)

    if df.empty:
        return {
            "state": state,
            "geo_type": geo_type,
            "geo_values": targets,
            "stat_type": stat_type,
            "historical": [],
            "forecast": [],
            "confidence_upper": [],
            "confidence_lower": [],
            "current_median": None,
            "predicted_median": None,
            "pct_change": None,
        }

    # Filter to time range
    cutoff = datetime.now() - pd.DateOffset(years=years)
    date_mask = df["CloseDate"].notna() & (df["CloseDate"] >= cutoff)
    df = df[date_mask]

    if df.empty:
        return {
            "state": state,
            "geo_type": geo_type,
            "geo_values": targets,
            "stat_type": stat_type,
            "historical": [],
            "forecast": [],
            "confidence_upper": [],
            "confidence_lower": [],
            "current_median": None,
            "predicted_median": None,
            "pct_change": None,
        }

    # Group by month
    use_average = stat_type.lower() == "average"
    grouped = df.groupby(
        [df["CloseDate"].dt.year.rename("year"),
         df["CloseDate"].dt.month.rename("month")]
    )[["ClosePrice"]]

    monthly = (grouped.mean(numeric_only=True) if use_average
               else grouped.median(numeric_only=True)).reset_index()
    monthly["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in monthly.iterrows()]
    )
    monthly = monthly.sort_values("Month").dropna(subset=["ClosePrice"])

    if monthly.empty:
        return {
            "state": state,
            "geo_type": geo_type,
            "geo_values": targets,
            "stat_type": stat_type,
            "historical": [],
            "forecast": [],
            "confidence_upper": [],
            "confidence_lower": [],
            "current_median": None,
            "predicted_median": None,
            "pct_change": None,
        }

    # Also compute monthly transaction counts
    counts = df.groupby(
        [df["CloseDate"].dt.year.rename("year"),
         df["CloseDate"].dt.month.rename("month")]
    ).size().reset_index(name="count")
    counts["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in counts.iterrows()]
    )
    count_map = dict(zip(counts["Month"], counts["count"]))

    historical = [
        {
            "date": row["Month"].strftime("%Y-%m"),
            "value": round(float(row["ClosePrice"]), 2),
            "count": int(count_map.get(row["Month"], 0)),
        }
        for _, row in monthly.iterrows()
    ]

    # Run forecast
    dates_arr = monthly["Month"].values
    values_arr = monthly["ClosePrice"].values

    fc = _linear_regression_forecast(dates_arr, values_arr, forecast_months)

    current_val = float(values_arr[-1])
    predicted_val = fc["forecast_values"][-1] if fc["forecast_values"] else current_val
    pct_change = ((predicted_val - current_val) / current_val * 100) if current_val > 0 else None

    forecast_points = [
        {"date": d, "value": v}
        for d, v in zip(fc["forecast_dates"], fc["forecast_values"])
    ]
    upper_points = [
        {"date": d, "value": v}
        for d, v in zip(fc["forecast_dates"], fc["confidence_upper"])
    ]
    lower_points = [
        {"date": d, "value": v}
        for d, v in zip(fc["forecast_dates"], fc["confidence_lower"])
    ]

    return {
        "state": state,
        "geo_type": geo_type,
        "geo_values": targets,
        "stat_type": stat_type,
        "historical": historical,
        "forecast": forecast_points,
        "confidence_upper": upper_points,
        "confidence_lower": lower_points,
        "current_median": round(current_val, 2),
        "predicted_median": round(predicted_val, 2),
        "pct_change": round(pct_change, 2) if pct_change is not None else None,
        "total_transactions": int(df.shape[0]),
    }
