"""Report API — market report data and KPIs for a city."""

from __future__ import annotations

import calendar
from datetime import datetime

import numpy as np
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


def _generate_narrative(city: str, state: str, kpis: list[dict], data_end: str) -> str:
    """Generate a LinkedIn newsletter-style narrative for the market report."""
    # Parse data_end for month name
    try:
        end_dt = datetime.strptime(data_end, "%Y-%m-%d")
        month_name = calendar.month_name[end_dt.month]
        year = end_dt.year
    except Exception:
        month_name = "recent months"
        year = datetime.now().year

    # Extract KPI values
    price_kpi = next((k for k in kpis if k["label"] == "Median Sales Price"), None)
    sales_kpi = next((k for k in kpis if k["label"] == "Closed Sales"), None)
    dom_kpi = next((k for k in kpis if k["label"] == "Days on Market"), None)
    listings_kpi = next((k for k in kpis if k["label"] == "New Listings"), None)

    price_val = price_kpi["value"] if price_kpi else "N/A"
    price_change = price_kpi["change"] if price_kpi else "N/A"
    price_dir = price_kpi["direction"] if price_kpi else "flat"

    sales_val = sales_kpi["value"] if sales_kpi else "N/A"
    sales_change = sales_kpi["change"] if sales_kpi else "N/A"

    dom_val = dom_kpi["value"] if dom_kpi else "N/A"
    dom_change = dom_kpi["change"] if dom_kpi else "N/A"

    listings_val = listings_kpi["value"] if listings_kpi else "N/A"
    listings_change = listings_kpi["change"] if listings_kpi else "N/A"

    # Build narrative
    if price_dir == "up":
        trend_word = "appreciation"
        trend_adj = "rising"
    elif price_dir == "down":
        trend_word = "softening"
        trend_adj = "declining"
    else:
        trend_word = "stability"
        trend_adj = "steady"

    narrative = (
        f"The {city}, {state} residential market continued to show {trend_word} "
        f"through {month_name} {year}, with the median sales price reaching "
        f"**{price_val}** ({price_change} year-over-year). "
        f"\n\n"
        f"Transaction volume tells an important story: **{sales_val}** closed sales "
        f"were recorded in the latest month ({sales_change} YoY), while "
        f"**{listings_val}** new listings entered the market ({listings_change} YoY). "
        f"This supply-demand dynamic continues to shape pricing conditions across the area."
        f"\n\n"
        f"Properties are spending an average of **{dom_val} days** on market "
        f"({dom_change} YoY), reflecting the pace at which buyers are absorbing "
        f"available inventory. "
    )

    if price_dir == "up":
        narrative += (
            f"With {trend_adj} prices and sustained buyer demand, sellers in {city} "
            f"maintain a favorable negotiating position heading into the next quarter."
        )
    elif price_dir == "down":
        narrative += (
            f"The {trend_adj} price trend may present opportunities for buyers "
            f"who have been waiting on the sidelines, though market fundamentals "
            f"in {city} remain sound."
        )
    else:
        narrative += (
            f"The {trend_adj} market conditions in {city} suggest a balanced "
            f"environment for both buyers and sellers as we move forward."
        )

    return narrative


def _build_recent_sales(df: pd.DataFrame, limit: int = 20) -> list[dict]:
    """Build a list of recent closed sales for the report table."""
    closed = df[df["StandardStatus"] == "Closed"].copy()
    if closed.empty:
        return []

    closed = closed.sort_values("CloseDate", ascending=False).head(limit)

    sales = []
    for _, row in closed.iterrows():
        addr_parts = []
        if pd.notna(row.get("StreetNumber")):
            addr_parts.append(str(row["StreetNumber"]))
        if pd.notna(row.get("StreetName")):
            addr_parts.append(str(row["StreetName"]))
        if pd.notna(row.get("StreetSuffix")):
            addr_parts.append(str(row["StreetSuffix"]))
        address = " ".join(addr_parts) or "N/A"

        close_price = float(row["ClosePrice"]) if pd.notna(row.get("ClosePrice")) else None
        list_price = float(row["ListPrice"]) if pd.notna(row.get("ListPrice")) else None
        close_date = row["CloseDate"].strftime("%Y-%m-%d") if pd.notna(row.get("CloseDate")) else None
        beds = int(row["BedroomsTotal"]) if pd.notna(row.get("BedroomsTotal")) else None
        baths = float(row["BathroomsTotalDecimal"]) if pd.notna(row.get("BathroomsTotalDecimal")) else None
        sqft = int(row["BuildingAreaTotal"]) if pd.notna(row.get("BuildingAreaTotal")) and row["BuildingAreaTotal"] > 0 else None
        dom = int(row["DaysOnMarket"]) if pd.notna(row.get("DaysOnMarket")) else None

        sales.append({
            "address": address,
            "close_price": close_price,
            "list_price": list_price,
            "close_date": close_date,
            "beds": beds,
            "baths": baths,
            "sqft": sqft,
            "dom": dom,
        })

    return sales


def _build_price_distribution(df: pd.DataFrame) -> list[dict]:
    """Build price distribution buckets for a histogram chart."""
    closed = df[(df["StandardStatus"] == "Closed") & df["ClosePrice"].notna()].copy()
    if closed.empty:
        return []

    prices = closed["ClosePrice"].dropna()
    if len(prices) == 0:
        return []

    # Create reasonable bins
    min_price = max(0, prices.quantile(0.02))
    max_price = prices.quantile(0.98)

    if max_price <= min_price:
        return []

    bins = np.linspace(min_price, max_price, 11)
    labels = []
    for i in range(len(bins) - 1):
        lo = bins[i]
        hi = bins[i + 1]
        if lo >= 1_000_000:
            lo_s = f"${lo / 1_000_000:.1f}M"
        elif lo >= 1_000:
            lo_s = f"${lo / 1_000:.0f}K"
        else:
            lo_s = f"${lo:.0f}"
        if hi >= 1_000_000:
            hi_s = f"${hi / 1_000_000:.1f}M"
        elif hi >= 1_000:
            hi_s = f"${hi / 1_000:.0f}K"
        else:
            hi_s = f"${hi:.0f}"
        labels.append(f"{lo_s}-{hi_s}")

    counts, _ = np.histogram(prices, bins=bins)

    return [{"range": label, "count": int(c)} for label, c in zip(labels, counts)]


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

    kpi_dicts = [k.model_dump() for k in kpis]

    # Build time-series data for charts (last 24 months)
    chart_cutoff = datetime.now() - pd.DateOffset(months=24)
    chart_sp = sp[sp["Month"] >= chart_cutoff].to_dict(orient="records") if not sp.empty else []
    chart_cs = cs[cs["Month"] >= chart_cutoff].to_dict(orient="records") if not cs.empty else []

    # Serialize datetime for JSON
    for row in chart_sp:
        row["Month"] = row["Month"].strftime("%Y-%m")
    for row in chart_cs:
        row["Month"] = row["Month"].strftime("%Y-%m")

    # Generate narrative
    narrative = _generate_narrative(city, state, kpi_dicts, data_end)

    # Recent sales table
    recent_sales = _build_recent_sales(df, limit=20)

    # Price distribution
    price_distribution = _build_price_distribution(df)

    # Headline
    price_kpi = next((k for k in kpi_dicts if k["label"] == "Median Sales Price"), None)
    if price_kpi and price_kpi["direction"] == "up":
        headline = f"{city} Home Prices Continue to Rise"
    elif price_kpi and price_kpi["direction"] == "down":
        headline = f"{city} Housing Market Shows Signs of Cooling"
    else:
        headline = f"{city} Market Holds Steady"

    return {
        "city": city,
        "state": state,
        "data_through": data_end,
        "headline": headline,
        "narrative": narrative,
        "kpis": kpi_dicts,
        "charts": {
            "sales_price": chart_sp,
            "closed_sales": chart_cs,
        },
        "price_distribution": price_distribution,
        "recent_sales": recent_sales,
        "podcast_url": f"https://podcastfy.certihomes.com/podcast/{city.lower().replace(' ', '-')}-{state.lower().replace(' ', '-')}",
    }


@router.get("/featured-cities")
async def get_featured_cities():
    """Return list of featured cities for pre-generated reports."""
    return {"cities": FEATURED_CITIES}
