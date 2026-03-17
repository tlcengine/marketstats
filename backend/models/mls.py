"""MLS data model — async port of the Streamlit MLS.py using Motor."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Optional, Sequence

import numpy as np
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorDatabase


# ── RESO standard fields every MLS must map to ──
RESO_FIELDS = (
    "StateOrProvince",
    "CountyOrParish",
    "City",
    "PostalCode",
    "OnMarketDate",
    "ClosePrice",
    "ListPrice",
    "OriginalListPrice",
    "Latitude",
    "Longitude",
    "StandardStatus",
    "CloseDate",
    "OffMarketDate",
    "BedroomsTotal",
    "BathroomsTotalDecimal",
    "BuildingAreaTotal",
    "ListPricePerSQFT",
    "DaysOnMarket",
    "LotSizeSquareFeet",
    "YearBuilt",
    "PropertyType",
    "StreetName",
    "StreetNumber",
    "StreetSuffix",
)


@dataclass
class MLSFeed:
    """Defines a single MLS feed's schema and collection info."""

    state: str                      # Full state name, e.g. "New Jersey"
    state_mls_name: str             # Value stored in the DB for state, e.g. "NJ"
    field_conversions: dict[str, str]  # RESO field -> DB field
    database: str                   # MongoDB database name
    collection: str                 # MongoDB collection name
    fix_listings: Optional[Callable[[pd.DataFrame], pd.DataFrame]] = None

    def __post_init__(self):
        self.field_conversions_reversed: dict[str, str] = {
            v: k for k, v in self.field_conversions.items()
        }
        self.request_fields: tuple[str, ...] = tuple(
            set(self.field_conversions.values())
        )


# ── Listing cleaning (shared across all feeds) ──

def _clean_listings(df: pd.DataFrame, feed: MLSFeed) -> pd.DataFrame:
    """Apply the same cleaning logic as the original MLS.getListings."""
    if df.empty:
        return df

    # Rename DB columns -> RESO names
    df.rename(columns=feed.field_conversions_reversed, inplace=True)

    # Ensure every RESO field exists
    for reso_field in feed.field_conversions:
        if reso_field not in df.columns:
            df[reso_field] = None

    # --- Date back-filling ---
    # Fix bogus OnMarketDate sentinel values
    df.loc[
        df["OnMarketDate"].isin(("1800-01-01", "1900-01-01")),
        "OnMarketDate",
    ] = pd.to_datetime(df["CloseDate"]) - pd.to_timedelta(df["DaysOnMarket"])

    df.loc[df["OffMarketDate"].isna(), "OffMarketDate"] = df["CloseDate"]
    df.loc[df["CloseDate"].isna(), "CloseDate"] = df["OffMarketDate"]

    if "ExpirationDate" in df.columns:
        df.loc[df["CloseDate"].isna(), "CloseDate"] = df["ExpirationDate"]

    # Derive CloseDate from OnMarketDate + DOM
    mask_no_close = df["CloseDate"].isna() & df["OnMarketDate"].notna() & df["DaysOnMarket"].notna()
    if mask_no_close.any():
        df.loc[mask_no_close, "CloseDate"] = (
            pd.to_datetime(df.loc[mask_no_close, "OnMarketDate"], yearfirst=True)
            + pd.to_timedelta(df.loc[mask_no_close, "DaysOnMarket"].astype(float), unit="D")
        )

    # Derive OnMarketDate from CloseDate - DOM
    mask_no_omd = df["OnMarketDate"].isna() & df["CloseDate"].notna() & df["DaysOnMarket"].notna()
    if mask_no_omd.any():
        df.loc[mask_no_omd, "OnMarketDate"] = (
            pd.to_datetime(df.loc[mask_no_omd, "CloseDate"], utc=True)
            - pd.to_timedelta(df.loc[mask_no_omd, "DaysOnMarket"].astype(float), unit="D")
        )

    # Derive DOM from dates
    mask_no_dom = df["DaysOnMarket"].isna() & df["OnMarketDate"].notna() & df["CloseDate"].notna()
    if mask_no_dom.any():
        df.loc[mask_no_dom, "DaysOnMarket"] = (
            pd.to_datetime(df.loc[mask_no_dom, "CloseDate"], utc=True)
            - pd.to_datetime(df.loc[mask_no_dom, "OnMarketDate"], utc=True)
        ).dt.days

    df["DaysOnMarket"] = pd.to_numeric(df["DaysOnMarket"], errors="coerce")

    # --- Numeric field cleaning ---
    df.loc[df["BuildingAreaTotal"] == 0, "BuildingAreaTotal"] = np.nan

    # ListPricePerSQFT
    if "ListPricePerSQFT" not in df.columns or df["ListPricePerSQFT"].isna().all():
        df["ListPricePerSQFT"] = (
            pd.to_numeric(df["ListPrice"], errors="coerce")
            / pd.to_numeric(df["BuildingAreaTotal"], errors="coerce")
        )
    else:
        mask = df["ListPricePerSQFT"].isna() & df["ListPrice"].notna() & df["BuildingAreaTotal"].notna()
        if mask.any():
            df.loc[mask, "ListPricePerSQFT"] = (
                pd.to_numeric(df.loc[mask, "ListPrice"], errors="coerce")
                / pd.to_numeric(df.loc[mask, "BuildingAreaTotal"], errors="coerce")
            )

    # LotSizeSquareFeet fallback
    if "LotSizeSquareFeet" not in df.columns or df["LotSizeSquareFeet"].isna().all():
        df["LotSizeSquareFeet"] = df["BuildingAreaTotal"]
    else:
        mask = df["LotSizeSquareFeet"].isna() & df["BuildingAreaTotal"].notna()
        df.loc[mask, "LotSizeSquareFeet"] = df.loc[mask, "BuildingAreaTotal"]

    # BathroomsTotalDecimal from Full + Half
    if "BathroomsFull" in df.columns and "BathroomsHalf" in df.columns:
        if "BathroomsTotalDecimal" not in df.columns or df["BathroomsTotalDecimal"].isna().all():
            df["BathroomsTotalDecimal"] = (
                pd.to_numeric(df["BathroomsFull"], errors="coerce")
                + 0.5 * pd.to_numeric(df["BathroomsHalf"], errors="coerce")
            )
        else:
            mask = (
                df["BathroomsTotalDecimal"].isna()
                & df["BathroomsFull"].notna()
                & df["BathroomsHalf"].notna()
            )
            if mask.any():
                df.loc[mask, "BathroomsTotalDecimal"] = (
                    pd.to_numeric(df.loc[mask, "BathroomsFull"], errors="coerce")
                    + 0.5 * pd.to_numeric(df.loc[mask, "BathroomsHalf"], errors="coerce")
                )

    # MLS-specific fix
    if feed.fix_listings is not None:
        df = feed.fix_listings(df)

    if df is None or df.empty:
        return pd.DataFrame()

    # --- Type conversions ---
    for col in ("OnMarketDate", "CloseDate", "OffMarketDate", "YearBuilt"):
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], utc=True, errors="coerce")
            df[col] = df[col].dt.tz_convert("UTC").dt.tz_localize(None)

    for col in (
        "ListPrice", "ClosePrice", "ListPricePerSQFT",
        "Latitude", "Longitude", "LotSizeSquareFeet",
        "OriginalListPrice", "BuildingAreaTotal",
    ):
        if col in df.columns:
            df[col] = pd.to_numeric(
                df[col].astype(str).replace("None", "nan"), errors="coerce"
            )

    return df


# ── Fix functions for specific MLSs ──

def _fix_acres_to_sqft(df: pd.DataFrame) -> pd.DataFrame:
    """CTMLS, MLSGrid, Paragon store lot size in acres — convert to sqft."""
    df["LotSizeSquareFeet"] = pd.to_numeric(
        df["LotSizeSquareFeet"].astype(str).replace("None", "nan"), errors="coerce"
    ) * 43560
    return df


# ── MLS Feed Registry (only active feeds) ──

MLS_FEEDS: dict[str, MLSFeed] = {
    "New Jersey": MLSFeed(
        state="New Jersey",
        state_mls_name="NJ",
        field_conversions={
            "StateOrProvince": "StateOrProvince",
            "CountyOrParish": "CountyOrParish",
            "City": "City",
            "PostalCode": "PostalCode",
            "OnMarketDate": "OnMarketDate",
            "ClosePrice": "ClosePrice",
            "ListPrice": "ListPrice",
            "OriginalListPrice": "OriginalListPrice",
            "Latitude": "Latitude",
            "Longitude": "Longitude",
            "StandardStatus": "StandardStatus",
            "CloseDate": "CloseDate",
            "OffMarketDate": "OffMarketDate",
            "BedroomsTotal": "BedroomsTotal",
            "BathroomsTotalDecimal": "BathroomsTotalDecimal",
            "BuildingAreaTotal": "BuildingAreaTotal",
            "ListPricePerSQFT": "ListPricePerSQFT",
            "DaysOnMarket": "DaysOnMarket",
            "LotSizeSquareFeet": "LotSizeSquareFeet",
            "YearBuilt": "YearBuilt",
            "PropertyType": "PropertyType",
            "StreetName": "StreetName",
            "StreetNumber": "StreetNumber",
            "StreetSuffix": "StreetSuffix",
        },
        database="housing-prices",
        collection="bridge-cjmls",
    ),
    "Georgia": MLSFeed(
        state="Georgia",
        state_mls_name="GA",
        field_conversions={
            "StateOrProvince": "StateOrProvince",
            "CountyOrParish": "CountyOrParish",
            "City": "City",
            "PostalCode": "PostalCode",
            "OnMarketDate": "AvailabilityDate",
            "ClosePrice": "ClosePrice",
            "ListPrice": "ListPrice",
            "OriginalListPrice": "OriginalListPrice",
            "Latitude": "Latitude",
            "Longitude": "Longitude",
            "StandardStatus": "StandardStatus",
            "CloseDate": "CloseDate",
            "OffMarketDate": "OffMarketDate",
            "BedroomsTotal": "BedroomsTotal",
            "BathroomsTotalDecimal": "BathroomsTotalDecimal",
            "BuildingAreaTotal": "BuildingAreaTotal",
            "ListPricePerSQFT": "ListPricePerSQFT",
            "DaysOnMarket": "DaysOnMarket",
            "LotSizeSquareFeet": "LotSizeSquareFeet",
            "YearBuilt": "YearBuilt",
            "PropertyType": "PropertyType",
            "StreetName": "StreetName",
            "StreetNumber": "StreetNumber",
            "StreetSuffix": "StreetSuffix",
        },
        database="housing-prices",
        collection="bridge-fmls",
    ),
    "New York": MLSFeed(
        state="New York",
        state_mls_name="NY",
        field_conversions={
            "StateOrProvince": "StateOrProvince",
            "CountyOrParish": "CountyOrParish",
            "City": "City",
            "PostalCode": "PostalCode",
            "OnMarketDate": "OnMarketDate",
            "ClosePrice": "ClosePrice",
            "ListPrice": "ListPrice",
            "OriginalListPrice": "OriginalListPrice",
            "Latitude": "Latitude",
            "Longitude": "Longitude",
            "StandardStatus": "StandardStatus",
            "CloseDate": "CloseDate",
            "OffMarketDate": "OffMarketDate",
            "BedroomsTotal": "BedroomsTotal",
            "BathroomsTotalDecimal": "BathroomsTotalInteger",
            "BuildingAreaTotal": "LotSizeArea",
            "ListPricePerSQFT": "RATIO_ListPrice_By_SQFT",
            "DaysOnMarket": "DaysOnMarket",
            "LotSizeSquareFeet": "LotSizeArea",
            "YearBuilt": "YearBuilt",
            "PropertyType": "PropertyType",
            "ExpirationDate": "ExpirationDate",
            "StreetName": "StreetName",
            "StreetNumber": "StreetNumber",
            "StreetSuffix": "StreetSuffix",
        },
        database="housing-prices",
        collection="trestle",
    ),
}


def get_feed(state: str) -> MLSFeed:
    """Look up an MLSFeed by state name. Raises KeyError if not found."""
    feed = MLS_FEEDS.get(state)
    if feed is None:
        raise KeyError(f"No MLS feed configured for state: {state}")
    return feed


def get_active_states() -> list[str]:
    """Return states with active MLS feeds."""
    return list(MLS_FEEDS.keys())


# ── Async data access functions (Motor) ──

async def fetch_listings(
    db: AsyncIOMotorDatabase,
    feed: MLSFeed,
    query_field: str,
    target_values: list[str],
) -> pd.DataFrame:
    """
    Async equivalent of MLS.getListings().

    Args:
        db: Motor database handle.
        feed: The MLSFeed defining field mappings / collection.
        query_field: RESO field name to filter on (City, CountyOrParish, PostalCode).
        target_values: List of values to match.

    Returns:
        Cleaned DataFrame with RESO-standard column names.
    """
    if not query_field or not target_values:
        return pd.DataFrame()

    db_field = feed.field_conversions.get(query_field)
    if db_field is None:
        raise ValueError(f"Unknown query field: {query_field}")

    mongo_filter: dict[str, Any] = {
        feed.field_conversions["StateOrProvince"]: feed.state_mls_name,
        db_field: {"$in": target_values},
    }

    projection = {f: 1 for f in feed.request_fields}

    collection = db[feed.collection]
    cursor = collection.find(filter=mongo_filter, projection=projection)

    docs: list[dict] = []
    async for doc in cursor:
        docs.append(doc)

    if not docs:
        return pd.DataFrame()

    df = pd.DataFrame(docs)
    return _clean_listings(df, feed)


async def fetch_counties(
    db: AsyncIOMotorDatabase,
    feed: MLSFeed,
) -> list[str]:
    """Return sorted list of counties for a feed."""
    collection = db[feed.collection]
    county_field = feed.field_conversions["CountyOrParish"]
    state_field = feed.field_conversions["StateOrProvince"]
    values = await collection.distinct(
        county_field,
        {state_field: feed.state_mls_name},
    )
    return sorted(v for v in values if v)


async def fetch_cities_with_counts(
    db: AsyncIOMotorDatabase,
    feed: MLSFeed,
) -> list[dict[str, Any]]:
    """Return list of {city, count} dicts sorted by city name."""
    collection = db[feed.collection]
    city_field = feed.field_conversions["City"]
    state_field = feed.field_conversions["StateOrProvince"]

    pipeline = [
        {"$match": {state_field: feed.state_mls_name}},
        {"$group": {"_id": f"${city_field}", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]

    results = []
    async for doc in collection.aggregate(pipeline):
        city_name = doc["_id"]
        if city_name:
            results.append({"city": city_name, "count": doc["count"]})
    return results


async def fetch_zip_codes(
    db: AsyncIOMotorDatabase,
    feed: MLSFeed,
) -> list[str]:
    """Return sorted 5-digit zip codes for a feed."""
    collection = db[feed.collection]
    zip_field = feed.field_conversions["PostalCode"]
    state_field = feed.field_conversions["StateOrProvince"]
    values = await collection.distinct(
        zip_field,
        {state_field: feed.state_mls_name},
    )
    return sorted(
        z for z in values
        if z and isinstance(z, str) and len(z) == 5 and z.isdigit()
    )
