"""Report API — market report data and KPIs for a city."""

from __future__ import annotations

from datetime import datetime

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from db import get_db
from models.mls import fetch_listings, get_feed
from models.schemas import ReportKPI
from services.constants import AXIS_FORMATS
from services.data_generator import (
    get_closed_sales,
    get_dom,
    get_new_listings,
    get_sales_price,
)

router = APIRouter()

FEATURED_CITIES = [
    {"city": "Edison", "state": "New Jersey"},
    {"city": "Princeton", "state": "New Jersey"},
    {"city": "Monroe", "state": "New Jersey"},
]


def _direction(change: float | None) -> str:
    if change is None:
        return "flat"
    if change > 0.001:
        return "up"
    if change < -0.001:
        return "down"
    return "flat"


def _fmt_dollar(val: float | None) -> str:
    if val is None or pd.isna(val):
        return "N/A"
    if abs(val) >= 1_000_000:
        return f"${val / 1_000_000:.1f}M"
    if abs(val) >= 1_000:
        return f"${val / 1_000:,.0f}K"
    return f"${val:,.0f}"


def _fmt_int(val: float | None) -> str:
    if val is None or pd.isna(val):
        return "N/A"
    return f"{int(val):,}"


def _fmt_pct(val: float | None) -> str:
    if val is None or pd.isna(val):
        return "N/A"
    return f"{val * 100:+.1f}%"


def _yoy(series: pd.DataFrame, col: str) -> tuple[float | None, float | None, float | None]:
    """Compute latest value, previous year value, and YoY change from a monthly series."""
    if series.empty:
        return None, None, None
    series = series.sort_values("Month")
    latest_val = series[col].iloc[-1]
    latest_month = series["Month"].iloc[-1]
    target = latest_month - pd.DateOffset(years=1)
    prev = series[
        (series["Month"].dt.year == target.year)
        & (series["Month"].dt.month == target.month)
    ]
    prev_val = prev[col].iloc[0] if not prev.empty else None
    change = None
    if prev_val is not None and prev_val != 0:
        change = (latest_val - prev_val) / abs(prev_val)
    return latest_val, prev_val, change


@router.get("/")
async def get_report(
    city: str = Query(..., description="City name"),
    state: str = Query(..., description="State name"),
):
    """Return market report KPIs for a city."""
    try:
        feed = get_feed(state)
    except KeyError:
        raise HTTPException(404, f"No MLS feed for state: {state}")

    db = get_db()
    df = await fetch_listings(db, feed, "City", [city])

    if df.empty:
        raise HTTPException(404, f"No listing data for {city}, {state}")

    # Filter to last 3 years for report
    cutoff = datetime.now() - pd.DateOffset(years=3)
    df = df[df["CloseDate"].notna() & (df["CloseDate"] >= cutoff)]

    if df.empty:
        raise HTTPException(404, f"No recent data for {city}, {state}")

    data_end = df["CloseDate"].max().strftime("%Y-%m-%d")

    # Compute KPIs
    sp = get_sales_price(df)
    cs = get_closed_sales(df)
    nl = get_new_listings(df)
    dom = get_dom(df)

    kpis = []

    # Median Sales Price
    val, prev, change = _yoy(sp, "Sales Price")
    kpis.append(ReportKPI(
        label="Median Sales Price",
        value=_fmt_dollar(val),
        change=_fmt_pct(change),
        direction=_direction(change),
    ))

    # Closed Sales (latest month)
    val, prev, change = _yoy(cs, "Closed Sales")
    kpis.append(ReportKPI(
        label="Closed Sales",
        value=_fmt_int(val),
        change=_fmt_pct(change),
        direction=_direction(change),
    ))

    # New Listings
    val, prev, change = _yoy(nl, "New Listings")
    kpis.append(ReportKPI(
        label="New Listings",
        value=_fmt_int(val),
        change=_fmt_pct(change),
        direction=_direction(change),
    ))

    # Days on Market
    val, prev, change = _yoy(dom, "Days on Market")
    kpis.append(ReportKPI(
        label="Days on Market",
        value=_fmt_int(val),
        change=_fmt_pct(change),
        direction=_direction(change),
    ))

    # Build time-series data for charts (last 24 months)
    chart_cutoff = datetime.now() - pd.DateOffset(months=24)
    chart_sp = sp[sp["Month"] >= chart_cutoff].to_dict(orient="records") if not sp.empty else []
    chart_cs = cs[cs["Month"] >= chart_cutoff].to_dict(orient="records") if not cs.empty else []

    # Serialize datetime for JSON
    for row in chart_sp:
        row["Month"] = row["Month"].strftime("%Y-%m")
    for row in chart_cs:
        row["Month"] = row["Month"].strftime("%Y-%m")

    return {
        "city": city,
        "state": state,
        "data_through": data_end,
        "kpis": [k.model_dump() for k in kpis],
        "charts": {
            "sales_price": chart_sp,
            "closed_sales": chart_cs,
        },
        "podcast_url": f"https://podcastfy.certihomes.com/podcast/{city.lower().replace(' ', '-')}-{state.lower().replace(' ', '-')}",
    }


@router.get("/featured-cities")
async def get_featured_cities():
    """Return list of featured cities for pre-generated reports."""
    return {"cities": FEATURED_CITIES}
