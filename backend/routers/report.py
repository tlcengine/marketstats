"""Report API — full market report data matching Streamlit 11_Market_Report.py."""

from __future__ import annotations

import calendar
import re
import urllib.parse
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from db import get_db

router = APIRouter()

FEATURED_CITIES = [
    {"city": "Edison", "state": "New Jersey", "desc": "NJ's Largest Market"},
    {"city": "Princeton", "state": "New Jersey", "desc": "Ivy League Town"},
    {"city": "Monroe", "state": "New Jersey", "desc": "Middlesex County"},
]

PRICE_SEGMENTS = {
    "All Prices": 0,
    "$500K+": 500_000,
    "$750K+": 750_000,
    "$1M+": 1_000_000,
    "$1.5M+": 1_500_000,
    "$2M+": 2_000_000,
}


# ── Formatting helpers ──


def _direction(change: float | None) -> str:
    if change is None:
        return "flat"
    if change > 0.001:
        return "up"
    if change < -0.001:
        return "down"
    return "flat"


def _fmt(val) -> str:
    if val is None or (isinstance(val, float) and (pd.isna(val) or val == 0)):
        return "N/A"
    if abs(val) >= 1_000_000:
        return f"${val / 1_000_000:.2f}M"
    if abs(val) >= 1_000:
        return f"${val / 1_000:.0f}K"
    return f"${val:,.0f}"


def _fmt_dollar(val: float | None) -> str:
    if val is None or pd.isna(val):
        return "N/A"
    if abs(val) >= 1_000_000:
        return f"${val / 1_000_000:.2f}M"
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


def _pct_str(current, previous) -> str:
    if previous == 0:
        return "N/A"
    pct = (current - previous) / previous * 100
    direction = "up" if pct > 0 else "down"
    return f"{direction} {abs(pct):.1f}%"


def _pct_val(current, previous) -> float:
    if previous == 0:
        return 0
    return (current - previous) / previous * 100


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


# ── Collection detection ──


async def _detect_collection(city: str) -> str:
    db = get_db()
    for col_name in ["bridge-cjmls", "bridge-fmls"]:
        count = await db[col_name].count_documents(
            {"City": re.compile(f"^{re.escape(city)}$", re.IGNORECASE), "StandardStatus": "Closed"}
        )
        if count > 10:
            return col_name
    return "bridge-cjmls"


# ── Direct MongoDB queries (inventory, cities, etc.) ──


async def _get_inventory(city: str, collection: str):
    db = get_db()
    base = {"City": re.compile(f"^{re.escape(city)}$", re.IGNORECASE)}
    active = await db[collection].count_documents({**base, "StandardStatus": "Active"})
    pending = await db[collection].count_documents({**base, "StandardStatus": "Active Under Contract"})
    coming = await db[collection].count_documents({**base, "StandardStatus": "Coming Soon"})
    active_under_1m = await db[collection].count_documents(
        {**base, "StandardStatus": "Active", "ListPrice": {"$lt": 1_000_000}}
    )
    active_over_1m = await db[collection].count_documents(
        {**base, "StandardStatus": "Active", "ListPrice": {"$gte": 1_000_000}}
    )
    return active, pending, coming, active_under_1m, active_over_1m


async def _get_report_data(city: str, min_price: int, collection: str) -> pd.DataFrame:
    db = get_db()
    match: dict = {
        "City": re.compile(f"^{re.escape(city)}$", re.IGNORECASE),
        "StandardStatus": "Closed",
        "CloseDate": {"$exists": True, "$ne": None},
    }
    if min_price > 0:
        match["ClosePrice"] = {"$gte": min_price}
    fields = {
        "CloseDate": 1, "ClosePrice": 1, "ListPrice": 1,
        "OriginalListPrice": 1, "DaysOnMarket": 1,
        "BedroomsTotal": 1, "BathroomsTotalDecimal": 1,
        "LivingArea": 1, "BuildingAreaTotal": 1,
        "PropertyType": 1, "PropertySubType": 1,
        "StreetNumber": 1, "StreetName": 1, "StreetSuffix": 1,
        "PostalCode": 1,
    }
    docs = []
    async for doc in db[collection].find(match, fields):
        docs.append(doc)
    if not docs:
        return pd.DataFrame()
    df = pd.DataFrame(docs).drop(columns=["_id"], errors="ignore")
    df["CloseDate"] = pd.to_datetime(df["CloseDate"], errors="coerce")
    df = df.dropna(subset=["CloseDate"])
    df["Year"] = df["CloseDate"].dt.year
    df["Month"] = df["CloseDate"].dt.to_period("M").astype(str)
    return df


async def _get_all_closed(city: str, collection: str) -> pd.DataFrame:
    db = get_db()
    match: dict = {
        "City": re.compile(f"^{re.escape(city)}$", re.IGNORECASE),
        "StandardStatus": "Closed",
        "CloseDate": {"$exists": True, "$ne": None},
    }
    fields = {"CloseDate": 1, "ClosePrice": 1, "DaysOnMarket": 1, "OriginalListPrice": 1, "ListPrice": 1}
    docs = []
    async for doc in db[collection].find(match, fields):
        docs.append(doc)
    if not docs:
        return pd.DataFrame()
    df = pd.DataFrame(docs).drop(columns=["_id"], errors="ignore")
    df["CloseDate"] = pd.to_datetime(df["CloseDate"], errors="coerce")
    return df.dropna(subset=["CloseDate"])


async def _get_cities() -> list[str]:
    db = get_db()
    pipeline = [
        {"$match": {"StandardStatus": "Closed", "CloseDate": {"$exists": True}}},
        {"$group": {"_id": "$City", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": 50}}},
        {"$sort": {"_id": 1}},
    ]
    results: dict[str, int] = {}
    for col_name in ["bridge-cjmls", "bridge-fmls"]:
        async for r in db[col_name].aggregate(pipeline):
            if r["_id"]:
                results[r["_id"]] = results.get(r["_id"], 0) + r["count"]
    return sorted(results.keys())


# ── Headline generation (exact Streamlit logic) ──


def _generate_headline(
    city: str,
    min_price: int,
    price_chg: float,
    sales_chg: float,
    r_dom: float,
    data_end: datetime,
    featured_names: list[str],
) -> str:
    city_idx = featured_names.index(city) if city in featured_names else (ord(city[0]) + len(city)) % 3
    lux = "Luxury " if min_price >= 1_000_000 else ""
    season = (
        "Spring" if data_end.month in [3, 4, 5]
        else "Fall" if data_end.month in [9, 10, 11]
        else "Summer" if data_end.month in [6, 7, 8]
        else "Winter"
    )

    if price_chg > 10:
        opts = [
            f"Prices Continue to Climb as {city}'s {lux}Market Heats Up",
            f"{city} Home Values Surge \u2014 Sellers Capitalize on Rising Demand",
            f"Double-Digit Price Gains Define {city}'s {lux}Market Momentum",
        ]
    elif price_chg > 3:
        opts = [
            f"Steady Price Growth Signals a Healthy {lux}Market in {city}",
            f"{city} Prices Edge Higher as Buyer Competition Persists",
            f"Measured Appreciation Continues to Reward {city} Homeowners",
        ]
    elif price_chg < -5:
        opts = [
            f"Price Adjustments Create Opportunity for Buyers in {city}",
            f"{city} Market Softens \u2014 A Window Opens for Strategic Buyers",
            f"Cooling Prices in {city} Signal a Shift Toward Buyer-Friendly Conditions",
        ]
    elif sales_chg > 10:
        opts = [
            f"Rising Transaction Volume Points to Growing Demand in {city}",
            f"Sales Activity Jumps in {city} as Buyer Confidence Returns",
            f"{city} Sees a Surge in Closings \u2014 Market Momentum Builds",
        ]
    elif sales_chg < -10:
        opts = [
            f"Sales Volume Pulls Back in {city}, but Pricing Holds Firm",
            f"Fewer Transactions in {city} Mask an Otherwise Resilient Market",
            f"{city} Closings Decline While Home Values Stay Steady",
        ]
    elif r_dom < 40:
        opts = [
            f"Homes Are Moving Fast in {city} \u2014 {lux}Sellers Have the Edge",
            f"Quick Turnarounds in {city} Reflect Tight Inventory and Strong Demand",
            f"Speed Defines {city}'s Market \u2014 Average Days on Market Stays Below 40",
        ]
    else:
        opts = [
            f"{city} Market Update: Balanced Conditions as {season} Takes Shape",
            f"Stability Rules in {city} \u2014 Neither Buyers nor Sellers Dominate",
            f"{city}'s {season} Market Holds Steady with Measured Activity",
        ]

    return opts[city_idx]


# ── Full narrative generation (matching Streamlit) ──


def _generate_full_narrative(
    city: str,
    state_label: str,
    min_price: int,
    price_label: str,
    data_end: datetime,
    r_sales: int,
    p_sales: int,
    r_avg: float,
    p_avg: float,
    r_med: float,
    p_med: float,
    r_dom: float,
    p_dom: float,
    r_vol: float,
    p_vol: float,
    r_max: float,
    active: int,
    pending: int,
    coming: int,
    active_under_1m: int,
    active_over_1m: int,
    sp_lp: float,
    mos: float,
    price_chg: float,
    sales_chg: float,
    dom_chg: float,
    under_1m_r_count: int,
    under_1m_p_count: int,
    under_1m_r_avg: float,
    under_1m_r_dom: float,
    over_1m_r_count: int,
    over_1m_p_count: int,
    over_1m_r_avg: float,
    over_1m_r_dom: float,
) -> dict:
    """Return narrative sections as a dict of HTML strings."""

    # Seasonal context
    if data_end.month in [3, 4]:
        season_open = f"As we transition into spring, {city}'s housing market is beginning to show the seasonal patterns that typically define the year's most active selling period."
    elif data_end.month in [5, 6]:
        season_open = f"The spring selling season is in full swing across {city}, and the data reflects a market finding its rhythm."
    elif data_end.month in [7, 8]:
        season_open = f"The summer months have brought a shift in {city}'s market. With many families focused on relocating before the school year, activity patterns are evolving."
    elif data_end.month in [9, 10]:
        season_open = f"Fall has arrived in {city}, and with it comes a renewed sense of urgency among both buyers and sellers looking to close before year-end."
    elif data_end.month in [11, 12]:
        season_open = f"As the year winds down, {city}'s housing market reflects the typical late-season dynamics \u2014 fewer listings, but serious buyers remain engaged."
    else:
        season_open = f"The winter months have brought measured activity to {city}'s housing market, though the data tells a more nuanced story than the weather might suggest."

    # Supply-demand thesis
    if mos < 3:
        thesis = f"The result is a market that remains firmly tilted toward sellers, with just <strong>{mos:.1f} months of supply</strong> \u2014 well below the six-month threshold that traditionally indicates balance."
    elif mos < 5:
        thesis = f"With <strong>{mos:.1f} months of supply</strong>, the market leans toward sellers, though conditions are approaching a more balanced state."
    elif mos < 7:
        thesis = f"At <strong>{mos:.1f} months of supply</strong>, the market is in relatively balanced territory, giving both buyers and sellers room to negotiate."
    else:
        thesis = f"With <strong>{mos:.1f} months of supply</strong>, buyers have meaningful leverage. Patience and selectivity are paying off."

    # Opening
    price_homes = f"homes priced at {price_label} have" if min_price > 0 else "homes have"
    price_trend = "rose" if price_chg > 0 else ("declined" if price_chg < 0 else "held steady at")
    median_note = f", while the median settled at <strong>{_fmt(r_med)}</strong>" if r_med != r_avg else ""

    opening = (
        f"<p>{season_open}</p>"
        f"<p>Over the past 12 months, <strong>{r_sales:,}</strong> {price_homes} closed in {city}, "
        f"{_pct_str(r_sales, p_sales)} year-over-year, totaling <strong>{_fmt(r_vol)}</strong> in transaction volume. "
        f"The average sale price {price_trend} to <strong>{_fmt(r_avg)}</strong>, "
        f"{_pct_str(r_avg, p_avg)} from the prior year{median_note}. "
        f"{thesis}</p>"
    )

    # Supply section
    over_1m_note = f" ({active_over_1m} priced at $1M+)" if active_over_1m > 0 else ""
    coming_note = f" and <strong>{coming}</strong> in coming-soon status" if coming > 0 else ""
    pipeline_note = (
        f"The pipeline suggests continued buyer engagement despite "
        f"{'elevated' if mos > 5 else 'constrained'} inventory levels."
        if pending > 0 else ""
    )

    dom_comparison = f"compared to {p_dom:.0f} days in the prior period \u2014 " if p_dom > 0 else ""
    if dom_chg < -10:
        dom_trend = "a meaningful acceleration that reflects strong demand"
    elif dom_chg < 0:
        dom_trend = "a slight acceleration in pace"
    elif dom_chg > 10:
        dom_trend = "a slight deceleration, giving buyers more time to evaluate options"
    else:
        dom_trend = "a pace consistent with the prior year"

    highest_sale = f"The highest sale in the trailing 12 months reached <strong>{_fmt(r_max)}</strong>." if r_max > 0 else ""

    supply = (
        f"<p>Active inventory currently stands at <strong>{active:,} listings</strong>{over_1m_note}, "
        f"with an additional <strong>{pending:,}</strong> under contract{coming_note}. "
        f"{pipeline_note}</p>"
        f"<p>Properties are spending an average of <strong>{r_dom:.0f} days on market</strong> before going under contract, "
        f"{dom_comparison}{dom_trend}. "
        f"{highest_sale}</p>"
    )

    # Demand & Pricing section
    if sales_chg > 0:
        demand_open = "Demand remains robust"
    elif sales_chg < -5:
        demand_open = "Transaction volume has moderated"
    else:
        demand_open = "Demand has held relatively steady"

    if sales_chg > 5:
        sales_note = "This pace of growth suggests buyers remain active despite pricing pressures."
    elif sales_chg < -5:
        sales_note = "The pullback is consistent with affordability constraints and limited inventory."
    else:
        sales_note = "This consistency reflects a market in equilibrium."

    if price_chg > 0:
        price_line = f"Average sale prices climbed to <strong>{_fmt(r_avg)}</strong>, {_pct_str(r_avg, p_avg)} year-over-year."
    elif price_chg < 0:
        price_line = f"Average sale prices eased to <strong>{_fmt(r_avg)}</strong>, {_pct_str(r_avg, p_avg)} year-over-year."
    else:
        price_line = f"Average sale prices held steady at <strong>{_fmt(r_avg)}</strong>."

    median_line = ""
    if p_med > 0 and abs(_pct_val(r_med, p_med)) > 2:
        median_line = f"The median price of <strong>{_fmt(r_med)}</strong> moved {_pct_str(r_med, p_med)}, "
        if abs(price_chg) > 3 and p_med > 0:
            median_line += "reinforcing the broad-based nature of the price movement."

    sp_lp_text = ""
    if sp_lp > 0:
        if sp_lp >= 1.0:
            sp_lp_text = f"Sellers are achieving <strong>{sp_lp:.1%}</strong> of their original asking price on average, indicating that well-priced properties are attracting competitive offers."
        elif sp_lp >= 0.97:
            sp_lp_text = f"The average sale-to-list ratio stands at <strong>{sp_lp:.1%}</strong>, suggesting sellers are receiving close to their asking price \u2014 a sign of realistic pricing and sustained demand."
        else:
            sp_lp_text = f"The average sale-to-list ratio of <strong>{sp_lp:.1%}</strong> indicates that buyers have some room to negotiate below asking price."

    if price_chg > 0 and sales_chg > 0:
        vol_context = "reflecting both higher prices and sustained transaction counts."
    elif price_chg > 0:
        vol_context = "driven primarily by price appreciation."
    elif sales_chg < 0 and price_chg > 0:
        vol_context = "as lower transaction counts offset price gains."
    else:
        vol_context = "consistent with the overall market trajectory."

    demand = (
        f"<p>{demand_open}. "
        f"Contract activity over the past 12 months totaled <strong>{r_sales:,}</strong> closed sales, "
        f"{'up' if sales_chg > 0 else 'down'} <strong>{abs(sales_chg):.1f}%</strong> from the prior year. "
        f"{sales_note}</p>"
        f"<p>{price_line} "
        f"{median_line} "
        f"{sp_lp_text}</p>"
        f"<p>Total dollar volume reached <strong>{_fmt(r_vol)}</strong>, {_pct_str(r_vol, p_vol)} from the prior period, "
        f"{vol_context}</p>"
    )

    # Price segment breakdown
    segment_breakdown = None
    if under_1m_r_count > 5 and over_1m_r_count > 5:
        total = under_1m_r_count + over_1m_r_count
        u_pct = f"{under_1m_r_count / total * 100:.0f}%" if total > 0 else ""

        over_chg = _pct_val(over_1m_r_count, over_1m_p_count)
        under_chg = _pct_val(under_1m_r_count, under_1m_p_count)

        if over_chg > under_chg:
            lux_note = "The luxury segment is showing particular strength, with transaction volume outpacing the broader market."
        elif over_chg < under_chg - 10:
            lux_note = "Activity in this segment has moderated relative to the broader market."
        else:
            lux_note = "Performance is tracking in line with the overall market."

        segment_breakdown = (
            f"<p><strong>Under $1M:</strong> {under_1m_r_count:,} contracts closed over the past 12 months, "
            f"{_pct_str(under_1m_r_count, under_1m_p_count)} year-over-year, with an average sale price of <strong>{_fmt(under_1m_r_avg)}</strong> "
            f"and properties averaging <strong>{under_1m_r_dom:.0f} days</strong> on market. "
            f"{'This segment remains the core of the market, accounting for ' + u_pct + ' of all transactions.' if total > 0 else ''}</p>"
            f"<p><strong>$1M and above:</strong> {over_1m_r_count:,} sales closed, "
            f"{_pct_str(over_1m_r_count, over_1m_p_count)} year-over-year, at an average of <strong>{_fmt(over_1m_r_avg)}</strong> "
            f"with <strong>{over_1m_r_dom:.0f} days</strong> on market. "
            f"{lux_note}</p>"
        )

    # Pull quote
    if mos < 4 and price_chg > 0:
        pull_quote = f"The bigger picture: constrained supply and steady demand are quietly tightening {city}'s market. Until inventory meaningfully expands, pricing pressure is likely to persist."
    elif mos > 6 and price_chg < 0:
        pull_quote = f"The shift is clear: rising inventory and softening prices are creating a window of opportunity for buyers who've been waiting on the sidelines."
    elif sales_chg > 10:
        pull_quote = f"Transaction momentum is building. The question now is whether supply can keep pace with demand as we move deeper into the {'spring' if data_end.month in [3, 4, 5] else 'selling'} season."
    else:
        pull_quote = f"Overall, {city}'s market is in transition. The data suggests a measured environment where both buyers and sellers can find footing with the right strategy."

    # Recommendations
    season_word = "spring" if data_end.month in [2, 3, 4] else "seasonal"
    if mos < 4:
        seller_rec = f"For sellers, the current environment is favorable. With {mos:.1f} months of supply, well-priced properties are attracting strong interest. Listing before the full {season_word} wave can help you stand out in a market with limited competition."
        buyer_rec = f"For buyers, preparation is key. Properties in {city} are spending an average of just {r_dom:.0f} days on market, so having financing in order and being ready to move quickly is essential. While the market may feel competitive, well-priced homes that need some work may offer relative value."
    elif mos < 7:
        seller_rec = f"For sellers, pricing accuracy matters more than ever in a balanced market. Properties priced right are still moving in {r_dom:.0f} days, but overpricing will lead to longer market times and eventual reductions."
        buyer_rec = f"For buyers, the balanced conditions offer room to be selective without feeling pressured. Take time to evaluate options, but don't hesitate on properties that meet your criteria \u2014 good inventory still attracts multiple interested parties."
    else:
        seller_rec = f"For sellers, patience and competitive pricing will be critical. With {mos:.1f} months of supply, buyers have options, and properties need to stand out on both price and presentation."
        buyer_rec = f"For buyers, this is your market. With ample inventory and {r_dom:.0f} days average market time, you have leverage to negotiate. Take your time, but remain engaged \u2014 the best-located properties still generate interest."

    recommendations = f"<p>{seller_rec}</p><p>{buyer_rec}</p>"

    # Closing CTA
    closing = "Want to discuss what these numbers mean for your property or your next purchase?"

    return {
        "opening": opening,
        "supply": supply,
        "demand": demand,
        "segment_breakdown": segment_breakdown,
        "pull_quote": pull_quote,
        "recommendations": recommendations,
        "closing": closing,
    }


# ── Build report text for podcast ──


def _build_report_text(
    city: str, headline: str, report_month: str,
    r_sales: int, r_vol: float, r_avg: float, r_med: float,
    price_chg: float, active: int, pending: int, r_dom: float,
    mos: float, sales_chg: float, sp_lp: float,
) -> str:
    parts = [
        f"{city} Market Update \u2014 {report_month}",
        f"Headline: {headline}",
        "",
        f"Over the past 12 months, {r_sales:,} homes have closed in {city}, "
        f"totaling {_fmt(r_vol)} in transaction volume. "
        f"The average sale price {'rose' if price_chg > 0 else 'declined'} to {_fmt(r_avg)}, "
        f"{abs(price_chg):.1f}% {'up' if price_chg > 0 else 'down'} from the prior year. "
        f"The median price is {_fmt(r_med)}.",
        "",
        f"Supply: Active inventory is {active:,} listings with {pending:,} under contract. "
        f"Properties spend an average of {r_dom:.0f} days on market. "
        f"Months of supply: {mos:.1f}.",
        "",
        f"Demand & Pricing: {r_sales:,} closed sales, "
        f"{'up' if sales_chg > 0 else 'down'} {abs(sales_chg):.1f}% year-over-year. "
        f"Sale-to-list ratio: {sp_lp:.1%}. "
        f"Total dollar volume: {_fmt(r_vol)}.",
    ]
    return "\n".join(parts)


# ── Build recent sales ──


def _safe_float(val) -> float | None:
    """Convert to float, returning None for NaN/inf/missing values."""
    if val is None or (isinstance(val, float) and (pd.isna(val) or np.isinf(val))):
        return None
    try:
        f = float(val)
        return None if pd.isna(f) or np.isinf(f) else f
    except (TypeError, ValueError):
        return None


def _build_recent_sales(df: pd.DataFrame, limit: int = 15) -> list[dict]:
    closed = df.sort_values("CloseDate", ascending=False).head(limit)
    if closed.empty:
        return []
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
        close_price = _safe_float(row.get("ClosePrice"))
        list_price = _safe_float(row.get("ListPrice"))
        close_date = row["CloseDate"].strftime("%b %d, %Y") if pd.notna(row.get("CloseDate")) else None
        beds = int(row["BedroomsTotal"]) if pd.notna(row.get("BedroomsTotal")) else None
        baths_key = "BathroomsTotalDecimal" if "BathroomsTotalDecimal" in row.index else "BathroomsTotalInteger"
        baths = _safe_float(row.get(baths_key))
        sqft_key = "LivingArea" if "LivingArea" in row.index and pd.notna(row.get("LivingArea")) else "BuildingAreaTotal"
        sqft_val = _safe_float(row.get(sqft_key))
        sqft = int(sqft_val) if sqft_val is not None and sqft_val > 0 else None
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


# ── Build price distribution ──


def _build_price_distribution(df: pd.DataFrame) -> list[dict]:
    closed = df[df["ClosePrice"].notna()].copy()
    if closed.empty:
        return []
    prices = closed["ClosePrice"].dropna()
    if len(prices) == 0:
        return []
    min_price = max(0, prices.quantile(0.02))
    max_price = prices.quantile(0.98)
    if max_price <= min_price:
        return []
    bins = np.linspace(min_price, max_price, 11)
    labels = []
    for i in range(len(bins) - 1):
        lo, hi = bins[i], bins[i + 1]
        lo_s = f"${lo / 1_000_000:.1f}M" if lo >= 1_000_000 else (f"${lo / 1_000:.0f}K" if lo >= 1_000 else f"${lo:.0f}")
        hi_s = f"${hi / 1_000_000:.1f}M" if hi >= 1_000_000 else (f"${hi / 1_000:.0f}K" if hi >= 1_000 else f"${hi:.0f}")
        labels.append(f"{lo_s}-{hi_s}")
    counts, _ = np.histogram(prices, bins=bins)
    return [{"range": label, "count": int(c)} for label, c in zip(labels, counts)]


# ── Share URLs ──


def _build_share_urls(city: str, state_label: str, report_month: str, r_sales: int, r_avg: float, active: int, sales_chg: float, p_sales: int) -> dict:
    share_title = f"{city} Market Update \u2014 {report_month}"
    share_text = (
        f"{city} {state_label} Market Update: {r_sales:,} sales "
        f"({_pct_str(r_sales, p_sales)} YoY), avg price {_fmt(r_avg)}. "
        f"{active} active listings."
    )
    share_url = "https://marketstats.certihomes.com/"
    enc_text = urllib.parse.quote(share_text)
    enc_url = urllib.parse.quote(share_url)
    enc_title = urllib.parse.quote(share_title)

    return {
        "title": share_title,
        "text": share_text,
        "url": share_url,
        "linkedin": f"https://www.linkedin.com/sharing/share-offsite/?url={enc_url}&title={enc_title}",
        "twitter": f"https://twitter.com/intent/tweet?text={enc_text}&url={enc_url}",
        "facebook": f"https://www.facebook.com/sharer/sharer.php?u={enc_url}&quote={enc_text}",
        "email": f"mailto:?subject={enc_title}&body={enc_text}%0A%0A{enc_url}",
    }


# ── Routes ──


@router.get("/cities")
async def get_all_cities():
    """Return all available cities for the report selector."""
    cities = await _get_cities()
    return {"cities": cities}


@router.get("/featured-cities")
async def get_featured_cities():
    """Return list of featured cities for pre-generated reports."""
    return {"cities": FEATURED_CITIES}


@router.get("/")
async def get_report(
    city: str = Query(..., description="City name"),
    state: str = Query("", description="State name (optional, auto-detected)"),
    min_price: int = Query(0, description="Minimum price filter"),
    price_label: str = Query("All Prices", description="Price segment label"),
):
    """Return full market report data for a city, matching the Streamlit version."""

    # Detect collection
    collection = await _detect_collection(city)
    state_label = "New Jersey" if "cjmls" in collection else "Georgia"
    mls_label = "CJMLS" if "cjmls" in collection else "FMLS"

    # Load data
    df = await _get_report_data(city, min_price, collection)

    # Auto-fallback
    fell_back = False
    original_price_label = price_label
    if df.empty or len(df[df["CloseDate"] >= (datetime.now() - timedelta(days=365))]) < 3:
        if min_price > 0:
            df = await _get_report_data(city, 0, collection)
            min_price = 0
            price_label = "All Prices"
            fell_back = True

    if df.empty:
        raise HTTPException(404, f"No closed sales found for {city}")

    df_all = await _get_all_closed(city, collection)
    active, pending, coming, active_under_1m, active_over_1m = await _get_inventory(city, collection)

    # Compute
    data_end = df["CloseDate"].max()
    now = datetime.now()
    report_month = now.strftime("%B %Y")
    report_date = now.strftime("%B %d, %Y")
    data_through = data_end.strftime("%B %Y")

    r12 = df[df["CloseDate"] >= (data_end - timedelta(days=365))]
    p12 = df[(df["CloseDate"] >= (data_end - timedelta(days=730))) & (df["CloseDate"] < (data_end - timedelta(days=365)))]

    r_sales, p_sales = len(r12), len(p12)
    r_avg = float(r12["ClosePrice"].mean()) if r_sales else 0
    p_avg = float(p12["ClosePrice"].mean()) if p_sales else 0
    r_med = float(r12["ClosePrice"].median()) if r_sales else 0
    p_med = float(p12["ClosePrice"].median()) if p_sales else 0
    r_dom = float(r12["DaysOnMarket"].mean()) if r_sales and "DaysOnMarket" in r12.columns else 0
    p_dom = float(p12["DaysOnMarket"].mean()) if p_sales and "DaysOnMarket" in p12.columns else 0
    r_vol = float(r12["ClosePrice"].sum()) if r_sales else 0
    p_vol = float(p12["ClosePrice"].sum()) if p_sales else 0
    r_max = float(r12["ClosePrice"].max()) if r_sales else 0

    # SP/LP ratio — prefer OriginalListPrice, fall back to ListPrice
    sp_lp = 0.0
    if r_sales:
        if "OriginalListPrice" in r12.columns:
            valid = r12[(r12["OriginalListPrice"].notna()) & (r12["OriginalListPrice"] > 0)]
            if len(valid):
                sp_lp = float((valid["ClosePrice"] / valid["OriginalListPrice"]).mean())
        if sp_lp == 0.0 and "ListPrice" in r12.columns:
            valid = r12[(r12["ListPrice"].notna()) & (r12["ListPrice"] > 0)]
            if len(valid):
                sp_lp = float((valid["ClosePrice"] / valid["ListPrice"]).mean())

    # All-price segment analysis
    under_1m_r_count = under_1m_p_count = over_1m_r_count = over_1m_p_count = 0
    under_1m_r_avg = over_1m_r_avg = under_1m_r_dom = over_1m_r_dom = 0.0
    if not df_all.empty:
        all_r12 = df_all[df_all["CloseDate"] >= (data_end - timedelta(days=365))]
        all_p12 = df_all[(df_all["CloseDate"] >= (data_end - timedelta(days=730))) & (df_all["CloseDate"] < (data_end - timedelta(days=365)))]
        under_1m_r = all_r12[all_r12["ClosePrice"] < 1_000_000]
        under_1m_p = all_p12[all_p12["ClosePrice"] < 1_000_000]
        over_1m_r = all_r12[all_r12["ClosePrice"] >= 1_000_000]
        over_1m_p = all_p12[all_p12["ClosePrice"] >= 1_000_000]
        under_1m_r_count = len(under_1m_r)
        under_1m_p_count = len(under_1m_p)
        over_1m_r_count = len(over_1m_r)
        over_1m_p_count = len(over_1m_p)
        under_1m_r_avg = float(under_1m_r["ClosePrice"].mean()) if len(under_1m_r) else 0
        over_1m_r_avg = float(over_1m_r["ClosePrice"].mean()) if len(over_1m_r) else 0
        under_1m_r_dom = float(under_1m_r["DaysOnMarket"].mean()) if len(under_1m_r) and "DaysOnMarket" in under_1m_r.columns else 0
        over_1m_r_dom = float(over_1m_r["DaysOnMarket"].mean()) if len(over_1m_r) and "DaysOnMarket" in over_1m_r.columns else 0

    mos = active / max(r_sales / 12, 1)

    sales_chg = _pct_val(r_sales, p_sales)
    price_chg = _pct_val(r_avg, p_avg)
    dom_chg = _pct_val(r_dom, p_dom)

    # Headline
    featured_names = [f["city"] for f in FEATURED_CITIES]
    headline = _generate_headline(city, min_price, price_chg, sales_chg, r_dom, data_end, featured_names)

    price_seg = price_label if min_price > 0 else "All Prices"

    # Full narrative sections
    narrative = _generate_full_narrative(
        city=city, state_label=state_label, min_price=min_price, price_label=price_label,
        data_end=data_end, r_sales=r_sales, p_sales=p_sales,
        r_avg=r_avg, p_avg=p_avg, r_med=r_med, p_med=p_med,
        r_dom=r_dom, p_dom=p_dom, r_vol=r_vol, p_vol=p_vol, r_max=r_max,
        active=active, pending=pending, coming=coming,
        active_under_1m=active_under_1m, active_over_1m=active_over_1m,
        sp_lp=sp_lp, mos=mos, price_chg=price_chg, sales_chg=sales_chg, dom_chg=dom_chg,
        under_1m_r_count=under_1m_r_count, under_1m_p_count=under_1m_p_count,
        under_1m_r_avg=under_1m_r_avg, under_1m_r_dom=under_1m_r_dom,
        over_1m_r_count=over_1m_r_count, over_1m_p_count=over_1m_p_count,
        over_1m_r_avg=over_1m_r_avg, over_1m_r_dom=over_1m_r_dom,
    )

    # KPIs
    kpis = [
        {"label": "Trailing 12m Sales", "value": f"{r_sales:,}", "change": _pct_str(r_sales, p_sales), "direction": _direction(sales_chg / 100 if p_sales else None)},
        {"label": "Avg Sale Price", "value": _fmt(r_avg), "change": _pct_str(r_avg, p_avg), "direction": _direction(price_chg / 100 if p_avg else None)},
        {"label": "Median Price", "value": _fmt(r_med), "change": _pct_str(r_med, p_med), "direction": _direction(_pct_val(r_med, p_med) / 100 if p_med else None)},
        {"label": "Avg Days on Market", "value": f"{r_dom:.0f}", "change": _pct_str(r_dom, p_dom), "direction": _direction(dom_chg / 100 if p_dom else None)},
        {"label": "Active Listings", "value": f"{active:,}", "change": None, "direction": "flat"},
        {"label": "SP/LP Ratio", "value": f"{sp_lp:.1%}" if sp_lp > 0 else "N/A", "change": None, "direction": "flat"},
        {"label": "Dollar Volume", "value": _fmt(r_vol), "change": _pct_str(r_vol, p_vol), "direction": _direction(_pct_val(r_vol, p_vol) / 100 if p_vol else None)},
        {"label": "Highest Sale", "value": _fmt(r_max), "change": None, "direction": "flat"},
    ]

    # Monthly aggregations (last 24)
    monthly = df.groupby("Month").agg(
        Sales=("ClosePrice", "count"),
        AvgPrice=("ClosePrice", "mean"),
        MedianPrice=("ClosePrice", "median"),
        TotalVolume=("ClosePrice", "sum"),
        AvgDOM=("DaysOnMarket", "mean"),
    ).reset_index().sort_values("Month")
    monthly_recent = monthly.tail(24).copy()

    monthly_data = []
    for _, row in monthly_recent.iterrows():
        monthly_data.append({
            "month": str(row["Month"]),
            "sales": int(row["Sales"]),
            "avg_price": round(float(row["AvgPrice"]), 0),
            "median_price": round(float(row["MedianPrice"]), 0),
            "total_volume": round(float(row["TotalVolume"]), 0),
            "avg_dom": round(float(row["AvgDOM"]), 1) if pd.notna(row["AvgDOM"]) else 0,
        })

    # Yearly aggregations (last 10)
    yearly = df.groupby("Year").agg(
        Sales=("ClosePrice", "count"),
        AvgPrice=("ClosePrice", "mean"),
        MedianPrice=("ClosePrice", "median"),
        TotalVolume=("ClosePrice", "sum"),
        AvgDOM=("DaysOnMarket", "mean"),
        MaxPrice=("ClosePrice", "max"),
    ).reset_index().sort_values("Year", ascending=False)
    yearly_data = []
    for _, row in yearly.head(10).iterrows():
        yearly_data.append({
            "year": int(row["Year"]),
            "sales": int(row["Sales"]),
            "avg_price": round(float(row["AvgPrice"]), 0),
            "median_price": round(float(row["MedianPrice"]), 0),
            "total_volume": round(float(row["TotalVolume"]), 0),
            "avg_dom": round(float(row["AvgDOM"]), 1) if pd.notna(row["AvgDOM"]) else 0,
            "max_price": round(float(row["MaxPrice"]), 0),
        })

    # Recent notable sales
    recent_sales = _build_recent_sales(df, limit=15)

    # Price distribution (last 12 months)
    price_distribution = _build_price_distribution(r12)

    # Share URLs
    share = _build_share_urls(city, state_label, report_month, r_sales, r_avg, active, sales_chg, p_sales)

    # Podcast URL
    podcast_url = f"https://podcastfy.certihomes.com/podcast/{city.lower().replace(' ', '-')}-{state_label.lower().replace(' ', '-')}"

    # Report text for podcast generation
    report_text = _build_report_text(
        city, headline, report_month, r_sales, r_vol, r_avg, r_med,
        price_chg, active, pending, r_dom, mos, sales_chg, sp_lp,
    )

    return {
        "city": city,
        "state": state_label,
        "mls_label": mls_label,
        "data_through": data_through,
        "report_month": report_month,
        "report_date": report_date,
        "headline": headline,
        "price_segment": price_seg,
        "fell_back": fell_back,
        "original_price_label": original_price_label if fell_back else None,
        "narrative": narrative,
        "kpis": kpis,
        "stats": {
            "r_sales": r_sales,
            "p_sales": p_sales,
            "r_avg": r_avg,
            "r_med": r_med,
            "r_dom": r_dom,
            "r_vol": r_vol,
            "r_max": r_max,
            "active": active,
            "pending": pending,
            "coming": coming,
            "sp_lp": sp_lp,
            "mos": mos,
            "price_chg": price_chg,
            "sales_chg": sales_chg,
            "dom_chg": dom_chg,
        },
        "charts": {
            "monthly": monthly_data,
            "yearly": yearly_data,
        },
        "price_distribution": price_distribution,
        "recent_sales": recent_sales,
        "share": share,
        "podcast_url": podcast_url,
        "podcast_generate_text": report_text,
    }
