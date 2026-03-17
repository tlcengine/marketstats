"""
Breakout mode — ported from breakout.py.

Splits a dataset by a categorical/range variable and applies a metric function
to each subset, producing multiple labeled series.
"""

from __future__ import annotations

from typing import Callable

import pandas as pd

# Max breakout series by number of comparison areas
BREAKOUT_LIMITS: dict[int, int] = {1: 5, 2: 3, 3: 2, 4: 0}


def get_breakout_limit(num_areas: int) -> int:
    return BREAKOUT_LIMITS.get(num_areas, 0)


# ── Price range definitions ──

PRICE_RANGES = [
    (0, 100_000, "$0-$100K"),
    (100_000, 250_000, "$100K-$250K"),
    (250_000, 500_000, "$250K-$500K"),
    (500_000, 1_000_000, "$500K-$1M"),
    (1_000_000, float("inf"), "$1M+"),
]

SQFT_RANGES = [
    (0, 1_500, "1,500 or Less"),
    (1_501, 2_000, "1,501-2,000"),
    (2_001, 2_500, "2,001-2,500"),
    (2_501, float("inf"), "2,501 or More"),
]


def apply_breakout(
    df: pd.DataFrame,
    breakout_field: str,
    breakout_values: list[str],
    dataset_label: str,
    group_func: Callable[[pd.DataFrame], pd.DataFrame],
) -> pd.DataFrame:
    """Split by exact values in breakout_field."""
    results = []
    for value in breakout_values:
        subset = df[df[breakout_field] == value]
        if not subset.empty:
            result = group_func(subset)
            result["Label"] = f"{dataset_label} - {value}"
            results.append(result)
    return pd.concat(results) if results else pd.DataFrame()


def apply_range_breakout(
    df: pd.DataFrame,
    field: str,
    ranges: list[tuple],
    dataset_label: str,
    group_func: Callable[[pd.DataFrame], pd.DataFrame],
) -> pd.DataFrame:
    """Break out by numeric ranges (low, high, label)."""
    results = []
    for low, high, label in ranges:
        subset = df[(df[field] >= low) & (df[field] < high)]
        if not subset.empty:
            result = group_func(subset)
            result["Label"] = f"{dataset_label} - {label}"
            results.append(result)
    return pd.concat(results) if results else pd.DataFrame()


def apply_bedroom_breakout(
    df: pd.DataFrame,
    dataset_label: str,
    group_func: Callable[[pd.DataFrame], pd.DataFrame],
) -> pd.DataFrame:
    bed_buckets = [
        (lambda d: d[d["BedroomsTotal"] <= 1], "1 or Fewer"),
        (lambda d: d[d["BedroomsTotal"] == 2], "2 Bedrooms"),
        (lambda d: d[d["BedroomsTotal"] == 3], "3 Bedrooms"),
        (lambda d: d[d["BedroomsTotal"] >= 4], "4 or More"),
    ]
    results = []
    for filter_fn, label in bed_buckets:
        subset = filter_fn(df)
        if not subset.empty:
            result = group_func(subset)
            result["Label"] = f"{dataset_label} - {label}"
            results.append(result)
    return pd.concat(results) if results else pd.DataFrame()


def apply_year_built_breakout(
    df: pd.DataFrame,
    dataset_label: str,
    group_func: Callable[[pd.DataFrame], pd.DataFrame],
) -> pd.DataFrame:
    current_year = pd.Timestamp.now().year
    new_mask = pd.to_datetime(df["YearBuilt"], errors="coerce").dt.year >= (current_year - 2)
    results = []
    for mask, label in [(new_mask, "New Construction"), (~new_mask, "Previously Owned")]:
        subset = df[mask]
        if not subset.empty:
            result = group_func(subset)
            result["Label"] = f"{dataset_label} - {label}"
            results.append(result)
    return pd.concat(results) if results else pd.DataFrame()


def get_breakout_values(df: pd.DataFrame, variable: str) -> list[str]:
    """Return available breakout labels from actual data."""
    if variable == "PropertyType":
        return sorted(v for v in df["PropertyType"].dropna().unique() if v)
    elif variable == "PriceRange":
        return [r[2] for r in PRICE_RANGES]
    elif variable == "Bedrooms":
        return ["1 or Fewer", "2 Bedrooms", "3 Bedrooms", "4 or More"]
    elif variable == "SquareFootage":
        return [r[2] for r in SQFT_RANGES]
    elif variable == "YearBuilt":
        return ["New Construction", "Previously Owned"]
    return []


def apply_breakout_for_variable(
    df: pd.DataFrame,
    variable: str,
    selected_values: list[str],
    dataset_label: str,
    group_func: Callable[[pd.DataFrame], pd.DataFrame],
) -> pd.DataFrame:
    """High-level dispatcher for breakout by variable name."""
    if variable == "PropertyType":
        return apply_breakout(df, "PropertyType", selected_values, dataset_label, group_func)
    elif variable == "PriceRange":
        label_map = {r[2]: r for r in PRICE_RANGES}
        ranges = [label_map[v] for v in selected_values if v in label_map]
        return apply_range_breakout(df, "ListPrice", ranges, dataset_label, group_func)
    elif variable == "Bedrooms":
        return apply_bedroom_breakout(df, dataset_label, group_func)
    elif variable == "SquareFootage":
        label_map = {r[2]: r for r in SQFT_RANGES}
        ranges = [label_map[v] for v in selected_values if v in label_map]
        return apply_range_breakout(df, "BuildingAreaTotal", ranges, dataset_label, group_func)
    elif variable == "YearBuilt":
        return apply_year_built_breakout(df, dataset_label, group_func)
    return pd.DataFrame()
