"""
Async metric computation — ported from dashboard/data_generators.py.

Each metric function takes a cleaned pandas DataFrame (RESO columns) and returns
a DataFrame with columns [<metric_column>, Month].  The generate_metric_data()
dispatcher calls the right function and concatenates results across areas.
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd
from pandas.tseries.offsets import MonthEnd

from .constants import AXIS_FORMATS, CLOSED_STATUSES, MAX_YEARS, METRIC_TO_COLUMN


# ── Helpers ──

def _ym_to_datetime(index: pd.MultiIndex) -> list:
    """Convert (year, month) multi-index to datetime strings for pd.to_datetime."""
    return [f"{int(y)}-{int(m)}" for y, m in index]


def _format_value(val: float, fmt: str) -> str:
    """Format a single value for display (Quick Facts)."""
    if pd.isna(val):
        return "N/A"
    if fmt == "$~s":
        if abs(val) >= 1_000_000:
            return f"${val / 1_000_000:.1f}M"
        elif abs(val) >= 1_000:
            return f"${val / 1_000:.0f}K"
        return f"${val:,.0f}"
    elif fmt == "%":
        return f"{val * 100:.1f}%" if abs(val) < 5 else f"{val:.1f}%"
    elif fmt == "~s":
        if abs(val) >= 1_000_000:
            return f"{val / 1_000_000:.1f}M"
        elif abs(val) >= 1_000:
            return f"{val / 1_000:.1f}K"
        return f"{val:,.0f}"
    return f"{val:,.1f}" if val != int(val) else f"{val:,.0f}"


# ── Individual metric functions ──

def get_new_listings(fl: pd.DataFrame) -> pd.DataFrame:
    nl = fl.groupby(
        [fl["OnMarketDate"].dt.year.rename("year"),
         fl["OnMarketDate"].dt.month.rename("month")]
    ).size().reset_index(name="New Listings")
    nl["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in nl.iterrows()]
    )
    return nl[["New Listings", "Month"]]


def get_closed_sales(fl: pd.DataFrame) -> pd.DataFrame:
    cs = fl.groupby(
        [fl["CloseDate"].dt.year.rename("year"),
         fl["CloseDate"].dt.month.rename("month")]
    ).size().reset_index(name="Closed Sales")
    cs["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in cs.iterrows()]
    )
    return cs[["Closed Sales", "Month"]]


def get_homes_for_sale(fl: pd.DataFrame) -> pd.DataFrame:
    dr = pd.date_range(
        end=datetime.today(), periods=12 * MAX_YEARS + 2, freq="MS", normalize=True
    )
    records = []
    for month in dr:
        month_end = month + MonthEnd(1)
        count = fl.loc[
            (fl["OnMarketDate"] <= month_end)
            & (
                (fl["CloseDate"] >= month)
                | (~fl["StandardStatus"].isin(CLOSED_STATUSES))
            )
        ].shape[0]
        if count > 0:
            records.append({"Month": month, "Homes for Sale": count})
    return pd.DataFrame(records) if records else pd.DataFrame(columns=["Month", "Homes for Sale"])


def get_pending_sales(fl: pd.DataFrame) -> pd.DataFrame:
    ps = fl[fl["StandardStatus"].isin(["Pending", "P-Pending Sale"])]
    if ps.empty:
        return pd.DataFrame(columns=["Pending Sales", "Month"])
    ps = ps.groupby(
        [ps["OnMarketDate"].dt.year.rename("year"),
         ps["OnMarketDate"].dt.month.rename("month")]
    ).size().reset_index(name="Pending Sales")
    ps["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in ps.iterrows()]
    )
    return ps[["Pending Sales", "Month"]]


def get_sales_price(
    fl: pd.DataFrame, use_average: bool = False
) -> pd.DataFrame:
    grouped = fl.groupby(
        [fl["CloseDate"].dt.year.rename("year"),
         fl["CloseDate"].dt.month.rename("month")]
    )[["ClosePrice"]]
    sp = grouped.mean(numeric_only=True) if use_average else grouped.median(numeric_only=True)
    sp = sp.reset_index()
    sp["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in sp.iterrows()]
    )
    sp.rename(columns={"ClosePrice": "Sales Price"}, inplace=True)
    return sp[["Sales Price", "Month"]]


def get_dom(fl: pd.DataFrame) -> pd.DataFrame:
    grouped = fl.groupby(
        [fl["CloseDate"].dt.year.rename("year"),
         fl["CloseDate"].dt.month.rename("month")]
    )[["DaysOnMarket"]]
    dom = grouped.median(numeric_only=True).reset_index()
    dom["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in dom.iterrows()]
    )
    dom.rename(columns={"DaysOnMarket": "Days on Market"}, inplace=True)
    return dom[["Days on Market", "Month"]]


def get_ppsqft(fl: pd.DataFrame) -> pd.DataFrame:
    p = fl[fl["ListPricePerSQFT"] != np.inf].copy()
    grouped = p.groupby(
        [p["CloseDate"].dt.year.rename("year"),
         p["CloseDate"].dt.month.rename("month")]
    )[["ListPricePerSQFT"]]
    result = grouped.median(numeric_only=True).reset_index()
    result["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in result.iterrows()]
    )
    result.rename(columns={"ListPricePerSQFT": "Price Per Sq Ft"}, inplace=True)
    result = result[result["Price Per Sq Ft"] > 0].dropna(subset=["Price Per Sq Ft"])
    return result[["Price Per Sq Ft", "Month"]]


def get_orig_price(fl: pd.DataFrame) -> pd.DataFrame:
    grouped = fl.groupby(
        [fl["CloseDate"].dt.year.rename("year"),
         fl["CloseDate"].dt.month.rename("month")]
    )[["OriginalListPrice"]]
    op = grouped.median(numeric_only=True).reset_index()
    op["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in op.iterrows()]
    )
    op.rename(columns={"OriginalListPrice": "Original List Price"}, inplace=True)
    return op[["Original List Price", "Month"]]


def get_pct_orig_price(fl: pd.DataFrame) -> pd.DataFrame:
    pop = fl[["CloseDate", "ClosePrice", "OriginalListPrice"]].replace(0.0, np.nan).dropna()
    if pop.empty:
        return pd.DataFrame(columns=["Percent of Original List Price", "Month"])
    pop["pct"] = pop["ClosePrice"] / pop["OriginalListPrice"]
    pop = pop[(pop["pct"] >= 0.5) & (pop["pct"] <= 2.0)]
    grouped = pop.groupby(
        [pop["CloseDate"].dt.year.rename("year"),
         pop["CloseDate"].dt.month.rename("month")]
    )[["pct"]]
    result = grouped.mean(numeric_only=True).reset_index()
    result["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in result.iterrows()]
    )
    result.rename(columns={"pct": "Percent of Original List Price"}, inplace=True)
    return result[["Percent of Original List Price", "Month"]]


def get_pct_last_price(fl: pd.DataFrame) -> pd.DataFrame:
    pllp = fl[["CloseDate", "ClosePrice", "ListPrice"]].replace(0.0, np.nan).dropna()
    if pllp.empty:
        return pd.DataFrame(columns=["Percent of Last List Price", "Month"])
    pllp["pct"] = pllp["ClosePrice"] / pllp["ListPrice"]
    pllp = pllp[(pllp["pct"] >= 0.5) & (pllp["pct"] <= 2.0)]
    grouped = pllp.groupby(
        [pllp["CloseDate"].dt.year.rename("year"),
         pllp["CloseDate"].dt.month.rename("month")]
    )[["pct"]]
    result = grouped.mean(numeric_only=True).reset_index()
    result["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in result.iterrows()]
    )
    result.rename(columns={"pct": "Percent of Last List Price"}, inplace=True)
    return result[["Percent of Last List Price", "Month"]]


def get_dollar_vol(fl: pd.DataFrame) -> pd.DataFrame:
    grouped = fl.groupby(
        [fl["CloseDate"].dt.year.rename("year"),
         fl["CloseDate"].dt.month.rename("month")]
    )[["ClosePrice"]]
    dv = grouped.sum(numeric_only=True).reset_index()
    dv["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in dv.iterrows()]
    )
    dv.rename(columns={"ClosePrice": "Dollar Volume"}, inplace=True)
    return dv[["Dollar Volume", "Month"]]


def get_absorption(fl: pd.DataFrame) -> pd.DataFrame:
    hfs = get_homes_for_sale(fl)
    cs = get_closed_sales(fl)
    if hfs.empty or cs.empty:
        return pd.DataFrame(columns=["Absorption Rate", "Month"])
    hfs_idx = hfs.set_index("Month")
    cs_idx = cs.set_index("Month")
    common = hfs_idx.index.intersection(cs_idx.index)
    records = []
    for m in common:
        inv = hfs_idx.loc[m, "Homes for Sale"]
        sold = cs_idx.loc[m, "Closed Sales"]
        if inv > 0:
            records.append({"Month": m, "Absorption Rate": sold / inv})
    return pd.DataFrame(records) if records else pd.DataFrame(columns=["Absorption Rate", "Month"])


def get_months_supply(fl: pd.DataFrame) -> pd.DataFrame:
    hfs = get_homes_for_sale(fl)
    cs = get_closed_sales(fl)
    if hfs.empty or cs.empty:
        return pd.DataFrame(columns=["Months Supply", "Month"])
    hfs_idx = hfs.set_index("Month")
    cs_idx = cs.set_index("Month").sort_index()
    cs_rolling = cs_idx["Closed Sales"].rolling(window=12).mean()
    records = []
    for m in hfs_idx.index:
        if m in cs_rolling.index:
            pace = cs_rolling.loc[m]
            if pd.notna(pace) and pace > 0:
                records.append({
                    "Month": m,
                    "Months Supply": hfs_idx.loc[m, "Homes for Sale"] / pace,
                })
    return pd.DataFrame(records) if records else pd.DataFrame(columns=["Months Supply", "Month"])


def get_shows_to_pending(fl: pd.DataFrame) -> pd.DataFrame:
    """Average number of showings before a listing goes pending.
    Requires ShowingsCount field in the data. Returns empty if not available."""
    if "ShowingsCount" not in fl.columns:
        return pd.DataFrame(columns=["Shows to Pending", "Month"])
    ps = fl[fl["StandardStatus"].isin(["Pending", "P-Pending Sale"])].copy()
    ps["ShowingsCount"] = pd.to_numeric(ps["ShowingsCount"], errors="coerce")
    ps = ps.dropna(subset=["ShowingsCount"])
    if ps.empty:
        return pd.DataFrame(columns=["Shows to Pending", "Month"])
    grouped = ps.groupby(
        [ps["OnMarketDate"].dt.year.rename("year"),
         ps["OnMarketDate"].dt.month.rename("month")]
    )[["ShowingsCount"]]
    result = grouped.mean(numeric_only=True).reset_index()
    result["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in result.iterrows()]
    )
    result.rename(columns={"ShowingsCount": "Shows to Pending"}, inplace=True)
    return result[["Shows to Pending", "Month"]]


def get_shows_per_listing(fl: pd.DataFrame) -> pd.DataFrame:
    """Average number of showings per listing per month.
    Requires ShowingsCount field in the data. Returns empty if not available."""
    if "ShowingsCount" not in fl.columns:
        return pd.DataFrame(columns=["Shows Per Listing", "Month"])
    sc = fl.copy()
    sc["ShowingsCount"] = pd.to_numeric(sc["ShowingsCount"], errors="coerce")
    sc = sc.dropna(subset=["ShowingsCount"])
    if sc.empty:
        return pd.DataFrame(columns=["Shows Per Listing", "Month"])
    grouped = sc.groupby(
        [sc["OnMarketDate"].dt.year.rename("year"),
         sc["OnMarketDate"].dt.month.rename("month")]
    )[["ShowingsCount"]]
    result = grouped.mean(numeric_only=True).reset_index()
    result["Month"] = pd.to_datetime(
        [f"{int(r.year)}-{int(r.month)}" for _, r in result.iterrows()]
    )
    result.rename(columns={"ShowingsCount": "Shows Per Listing"}, inplace=True)
    return result[["Shows Per Listing", "Month"]]


# ── Dispatcher ──

_METRIC_FUNC_MAP = {
    "MedianSalesPrice": lambda fl: get_sales_price(fl, use_average=False),
    "AverageSalesPrice": lambda fl: get_sales_price(fl, use_average=True),
    "NewListings": get_new_listings,
    "ClosedSales": get_closed_sales,
    "Inventory": get_homes_for_sale,
    "PendingSales": get_pending_sales,
    "DaysOnMarket": get_dom,
    "PricePerSqFt": get_ppsqft,
    "OriginalListPrice": get_orig_price,
    "PctOfListPrice": get_pct_orig_price,
    "ListToSaleRatio": get_pct_last_price,
    "DollarVolume": get_dollar_vol,
    "AbsorptionRate": get_absorption,
    "MonthsSupply": get_months_supply,
    "ShowsToPending": get_shows_to_pending,
    "ShowsPerListing": get_shows_per_listing,
}


def generate_metric_data(
    metric_key: str,
    listings_by_area: list[pd.DataFrame],
    area_labels: list[str],
    use_average: bool = False,
) -> tuple[pd.DataFrame, str]:
    """
    Generate time-series data for a single metric across multiple areas.

    Returns (combined_df, column_name) where combined_df has columns:
        [<column_name>, Month, Label]
    """
    col = METRIC_TO_COLUMN.get(metric_key)
    if col is None:
        raise ValueError(f"Unknown metric key: {metric_key}")

    if metric_key == "MedianSalesPrice" and use_average:
        func = _METRIC_FUNC_MAP["AverageSalesPrice"]
    else:
        func = _METRIC_FUNC_MAP.get(metric_key)

    if func is None:
        raise ValueError(f"No generator for metric: {metric_key}")

    frames = []
    for fl, label in zip(listings_by_area, area_labels):
        if fl.empty:
            continue
        result = func(fl)
        if not result.empty:
            result["Label"] = label
            frames.append(result)

    if frames:
        combined = pd.concat(frames, ignore_index=True)
    else:
        combined = pd.DataFrame(columns=[col, "Month", "Label"])

    return combined, col


def compute_quick_facts(
    metric_key: str,
    listings_by_area: list[pd.DataFrame],
    area_labels: list[str],
    use_average: bool = False,
) -> list[dict]:
    """
    Compute latest value + YoY change for each area.

    Returns list of dicts with keys: area_name, latest_value, previous_value,
    yoy_change, period.
    """
    combined, col = generate_metric_data(
        metric_key, listings_by_area, area_labels, use_average
    )
    fmt = AXIS_FORMATS.get(col, "f")

    facts = []
    for label in area_labels:
        area_data = combined[combined["Label"] == label].sort_values("Month")
        if area_data.empty:
            facts.append({
                "area_name": label,
                "latest_value": None,
                "previous_value": None,
                "yoy_change": None,
                "period": None,
            })
            continue

        latest_row = area_data.iloc[-1]
        latest_val = latest_row[col]
        latest_month = latest_row["Month"]

        # Find same month last year
        target_month = latest_month - pd.DateOffset(years=1)
        prev_data = area_data[
            (area_data["Month"].dt.year == target_month.year)
            & (area_data["Month"].dt.month == target_month.month)
        ]

        prev_val = prev_data[col].iloc[0] if not prev_data.empty else None
        yoy = None
        if prev_val is not None and prev_val != 0:
            yoy = (latest_val - prev_val) / abs(prev_val)

        facts.append({
            "area_name": label,
            "latest_value": float(latest_val) if pd.notna(latest_val) else None,
            "previous_value": float(prev_val) if pd.notna(prev_val) else None,
            "yoy_change": float(yoy) if yoy is not None and pd.notna(yoy) else None,
            "period": latest_month.strftime("%Y-%m"),
        })

    return facts
