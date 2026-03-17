"""Metrics API — time-series market data for charts + quick facts."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from db import get_db
from models.mls import fetch_listings, get_feed
from models.schemas import (
    MetricDataPoint,
    MetricResponse,
    MetricSeries,
    QuickFact,
)
from services.constants import AXIS_FORMATS, METRIC_LABELS, METRIC_TO_COLUMN
from services.data_generator import compute_quick_facts, generate_metric_data

router = APIRouter()

# Geo type -> RESO query field
_GEO_TYPE_MAP = {
    "County": "CountyOrParish",
    "City": "City",
    "PostalCode": "PostalCode",
    "Zip": "PostalCode",
}

# Palette for multi-area comparison
_COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"]


async def _fetch_area_listings(
    state: str,
    geo_type: str | None,
    geo_values: str | None,
    years: int,
) -> tuple[list[pd.DataFrame], list[str]]:
    """Fetch listings for each area (semicolon-separated groups of geo_values)."""
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

    # Support multiple areas separated by semicolons, each area has comma-separated values
    area_groups = [g.strip() for g in geo_values.split(";") if g.strip()]
    listings_list: list[pd.DataFrame] = []
    labels: list[str] = []

    for i, group in enumerate(area_groups):
        targets = [v.strip() for v in group.split(",") if v.strip()]
        if not targets:
            continue

        df = await fetch_listings(db, feed, query_field, targets)

        # Filter to requested time range
        if not df.empty and years > 0:
            cutoff = datetime.now() - pd.DateOffset(years=years)
            # Use CloseDate as the primary date filter
            date_mask = df["CloseDate"].notna() & (df["CloseDate"] >= cutoff)
            df = df[date_mask]

        label = ", ".join(targets) if len(targets) <= 2 else f"{targets[0]} +{len(targets) - 1}"
        listings_list.append(df)
        labels.append(label)

    return listings_list, labels


@router.get("/")
async def get_metrics(
    state: str = Query(..., description="State name"),
    metric: str = Query("MedianSalesPrice", description="Metric key"),
    geo_type: Optional[str] = Query(None, description="County, City, or PostalCode"),
    geo_values: Optional[str] = Query(None, description="Comma-separated geo values; semicolons separate areas"),
    years: int = Query(5, ge=1, le=20, description="Number of years of data"),
    stat_type: str = Query("Median", description="Median or Average (for sales price)"),
):
    """Return time-series metric data for charting."""
    use_average = stat_type.lower() == "average"

    # Map legacy metric key if user sends "AverageSalesPrice"
    effective_metric = metric
    if metric == "AverageSalesPrice":
        effective_metric = "MedianSalesPrice"
        use_average = True

    listings_list, labels = await _fetch_area_listings(state, geo_type, geo_values, years)

    combined, col = generate_metric_data(
        effective_metric, listings_list, labels, use_average=use_average
    )

    # Build response series
    series_list: list[MetricSeries] = []
    for i, label in enumerate(labels):
        area_data = combined[combined["Label"] == label].sort_values("Month")
        points = [
            MetricDataPoint(
                date=row["Month"].strftime("%Y-%m"),
                value=float(row[col]) if pd.notna(row[col]) else None,
            )
            for _, row in area_data.iterrows()
        ]
        series_list.append(MetricSeries(
            name=label,
            data=points,
            color=_COLORS[i % len(_COLORS)],
        ))

    y_fmt = AXIS_FORMATS.get(col, "f")
    y_label = METRIC_LABELS.get(metric, col)

    return MetricResponse(
        metric=metric,
        stat_type=stat_type,
        series=series_list,
        y_axis_label=y_label,
        y_axis_format=y_fmt,
    )


@router.get("/quick-facts")
async def get_quick_facts(
    state: str = Query(...),
    metric: str = Query("MedianSalesPrice"),
    geo_type: Optional[str] = Query(None),
    geo_values: Optional[str] = Query(None),
    stat_type: str = Query("Median"),
):
    """Return latest value + YoY change for quick facts panel."""
    use_average = stat_type.lower() == "average"
    effective_metric = metric
    if metric == "AverageSalesPrice":
        effective_metric = "MedianSalesPrice"
        use_average = True

    listings_list, labels = await _fetch_area_listings(state, geo_type, geo_values, years=5)

    facts = compute_quick_facts(effective_metric, listings_list, labels, use_average=use_average)

    return {
        "metric": metric,
        "facts": [
            QuickFact(
                area_name=f["area_name"],
                latest_value=f["latest_value"],
                previous_value=f["previous_value"],
                yoy_change=f["yoy_change"],
                period=f["period"],
            ).model_dump()
            for f in facts
        ],
    }
