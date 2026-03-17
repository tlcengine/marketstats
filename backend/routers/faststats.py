"""FastStats API — aggregated monthly market indicators for all 13 metrics."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from db import get_db
from models.mls import fetch_listings, get_feed
from services.data_generator import generate_metric_data

router = APIRouter()

# Geo type mapping
_GEO_TYPE_MAP = {
    "County": "CountyOrParish",
    "City": "City",
    "PostalCode": "PostalCode",
    "Zip": "PostalCode",
}

# All 13 metric keys
METRIC_KEYS = [
    "MedianSalesPrice",
    "NewListings",
    "ClosedSales",
    "Inventory",
    "PendingSales",
    "DaysOnMarket",
    "PricePerSqFt",
    "DollarVolume",
    "MonthsSupply",
    "AbsorptionRate",
    "PctOfListPrice",
    "AverageSalesPrice",
    "ListToSaleRatio",
]

METRIC_LABELS = {
    "MedianSalesPrice": "Median Sales Price",
    "NewListings": "New Listings",
    "ClosedSales": "Closed Sales",
    "Inventory": "Homes for Sale",
    "PendingSales": "Pending Sales",
    "DaysOnMarket": "Days on Market",
    "PricePerSqFt": "Price Per Sq Ft",
    "DollarVolume": "Dollar Volume",
    "MonthsSupply": "Months Supply",
    "AbsorptionRate": "Absorption Rate",
    "PctOfListPrice": "% of List Price",
    "AverageSalesPrice": "Average Sales Price",
    "ListToSaleRatio": "List-to-Sale Ratio",
}

METRIC_FORMATS = {
    "MedianSalesPrice": "$",
    "NewListings": "#",
    "ClosedSales": "#",
    "Inventory": "#",
    "PendingSales": "#",
    "DaysOnMarket": "d",
    "PricePerSqFt": "$",
    "DollarVolume": "$big",
    "MonthsSupply": "f",
    "AbsorptionRate": "%",
    "PctOfListPrice": "%",
    "AverageSalesPrice": "$",
    "ListToSaleRatio": "f",
}


@router.get("/")
async def get_faststats(
    state: str = Query(..., description="State name"),
    geo_type: Optional[str] = Query(None, description="County, City, or PostalCode"),
    geo_values: Optional[str] = Query(None, description="Comma-separated values"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12)"),
    year: Optional[int] = Query(None, description="Year"),
    stat_type: str = Query("Median"),
):
    """Return all 13 metrics for a geography and time period."""
    try:
        feed = get_feed(state)
    except KeyError:
        raise HTTPException(404, f"No MLS feed for state: {state}")

    if not geo_type or not geo_values:
        raise HTTPException(400, "geo_type and geo_values are required")

    query_field = _GEO_TYPE_MAP.get(geo_type)
    if query_field is None:
        raise HTTPException(400, f"Invalid geo_type: {geo_type}")

    db = get_db()
    targets = [v.strip() for v in geo_values.split(",") if v.strip()]
    if not targets:
        raise HTTPException(400, "No geo values provided")

    df = await fetch_listings(db, feed, query_field, targets)

    if df.empty:
        raise HTTPException(404, "No listings found for the selected area")

    # Determine target month/year
    now = datetime.now()
    target_year = year or now.year
    target_month = month
    if not target_month:
        # Default to most recent complete month
        if now.month == 1:
            target_month = 12
            target_year = now.year - 1
        else:
            target_month = now.month - 1

    use_average = stat_type.lower() == "average"

    metrics_result = []

    for metric_key in METRIC_KEYS:
        effective_metric = metric_key
        metric_use_average = use_average
        if metric_key == "AverageSalesPrice":
            effective_metric = "MedianSalesPrice"
            metric_use_average = True

        try:
            combined, col = generate_metric_data(
                effective_metric, [df], [geo_values], use_average=metric_use_average
            )

            if combined.empty:
                metrics_result.append({
                    "metric": metric_key,
                    "label": METRIC_LABELS.get(metric_key, metric_key),
                    "format": METRIC_FORMATS.get(metric_key, "f"),
                    "current_value": None,
                    "prior_value": None,
                    "yoy_change": None,
                })
                continue

            # Find current and prior period values
            combined["Month"] = pd.to_datetime(combined["Month"])
            combined["year"] = combined["Month"].dt.year
            combined["month"] = combined["Month"].dt.month

            current = combined[
                (combined["year"] == target_year) & (combined["month"] == target_month)
            ]
            prior = combined[
                (combined["year"] == target_year - 1)
                & (combined["month"] == target_month)
            ]

            cur_val = float(current[col].iloc[0]) if not current.empty and pd.notna(current[col].iloc[0]) else None
            prev_val = float(prior[col].iloc[0]) if not prior.empty and pd.notna(prior[col].iloc[0]) else None

            yoy_change = None
            if cur_val is not None and prev_val is not None and prev_val != 0:
                yoy_change = round((cur_val - prev_val) / abs(prev_val) * 100, 1)

            metrics_result.append({
                "metric": metric_key,
                "label": METRIC_LABELS.get(metric_key, metric_key),
                "format": METRIC_FORMATS.get(metric_key, "f"),
                "current_value": cur_val,
                "prior_value": prev_val,
                "yoy_change": yoy_change,
            })
        except Exception:
            metrics_result.append({
                "metric": metric_key,
                "label": METRIC_LABELS.get(metric_key, metric_key),
                "format": METRIC_FORMATS.get(metric_key, "f"),
                "current_value": None,
                "prior_value": None,
                "yoy_change": None,
            })

    area_label = ", ".join(targets)

    return {
        "area": area_label,
        "month": target_month,
        "year": target_year,
        "state": state,
        "metrics": metrics_result,
    }
