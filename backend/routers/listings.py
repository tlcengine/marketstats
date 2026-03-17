"""Listings API — browse and filter MLS listings."""

from __future__ import annotations

from typing import Optional

import pandas as pd
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query

from db import get_db
from models.mls import fetch_listings, get_feed
from models.schemas import ListingSummary, ListingsResponse

router = APIRouter()

# Geo type -> RESO query field
_GEO_TYPE_MAP = {
    "County": "CountyOrParish",
    "City": "City",
    "PostalCode": "PostalCode",
    "Zip": "PostalCode",
}


def _build_address(row: pd.Series) -> Optional[str]:
    parts = []
    for f in ("StreetNumber", "StreetName", "StreetSuffix"):
        val = row.get(f)
        if pd.notna(val) and str(val).strip():
            parts.append(str(val).strip())
    return " ".join(parts) if parts else None


@router.get("/", response_model=ListingsResponse)
async def get_listings(
    state: str = Query(..., description="State name"),
    geo_type: Optional[str] = Query(None, description="County, City, or PostalCode"),
    geo_values: Optional[str] = Query(None, description="Comma-separated geo values"),
    status: Optional[str] = Query(None, description="StandardStatus filter"),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    property_type: Optional[str] = Query(None),
    bedrooms: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """Return paginated listings with filters."""
    try:
        feed = get_feed(state)
    except KeyError:
        raise HTTPException(404, f"No MLS feed for state: {state}")

    if not geo_type or not geo_values:
        raise HTTPException(400, "geo_type and geo_values are required")

    query_field = _GEO_TYPE_MAP.get(geo_type)
    if query_field is None:
        raise HTTPException(400, f"Invalid geo_type: {geo_type}. Use County, City, or PostalCode.")

    targets = [v.strip() for v in geo_values.split(",") if v.strip()]
    if not targets:
        raise HTTPException(400, "geo_values must contain at least one value")

    db = get_db()
    df = await fetch_listings(db, feed, query_field, targets)

    if df.empty:
        return ListingsResponse(listings=[], total=0, page=page, page_size=page_size)

    # Apply post-fetch filters
    if status:
        df = df[df["StandardStatus"] == status]
    if min_price is not None:
        df = df[df["ListPrice"] >= min_price]
    if max_price is not None:
        df = df[df["ListPrice"] <= max_price]
    if property_type:
        df = df[df["PropertyType"] == property_type]
    if bedrooms is not None:
        df = df[pd.to_numeric(df["BedroomsTotal"], errors="coerce") >= bedrooms]

    total = len(df)

    # Sort by CloseDate descending, then paginate
    df = df.sort_values("CloseDate", ascending=False, na_position="last")
    start = (page - 1) * page_size
    page_df = df.iloc[start : start + page_size]

    listings = []
    for _, row in page_df.iterrows():
        listings.append(ListingSummary(
            id=str(row.get("_id", "")),
            address=_build_address(row),
            city=row.get("City") if pd.notna(row.get("City")) else None,
            state=state,
            zip_code=row.get("PostalCode") if pd.notna(row.get("PostalCode")) else None,
            list_price=float(row["ListPrice"]) if pd.notna(row.get("ListPrice")) else None,
            close_price=float(row["ClosePrice"]) if pd.notna(row.get("ClosePrice")) else None,
            bedrooms=int(row["BedroomsTotal"]) if pd.notna(row.get("BedroomsTotal")) else None,
            bathrooms=float(row["BathroomsTotalDecimal"]) if pd.notna(row.get("BathroomsTotalDecimal")) else None,
            sqft=float(row["BuildingAreaTotal"]) if pd.notna(row.get("BuildingAreaTotal")) else None,
            status=row.get("StandardStatus") if pd.notna(row.get("StandardStatus")) else None,
            latitude=float(row["Latitude"]) if pd.notna(row.get("Latitude")) else None,
            longitude=float(row["Longitude"]) if pd.notna(row.get("Longitude")) else None,
            on_market_date=row["OnMarketDate"].strftime("%Y-%m-%d") if pd.notna(row.get("OnMarketDate")) else None,
        ))

    return ListingsResponse(
        listings=listings,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{listing_id}")
async def get_listing(listing_id: str, state: str = Query(...)):
    """Return a single listing by MongoDB _id."""
    try:
        feed = get_feed(state)
    except KeyError:
        raise HTTPException(404, f"No MLS feed for state: {state}")

    db = get_db()
    collection = db[feed.collection]
    try:
        doc = await collection.find_one({"_id": ObjectId(listing_id)})
    except Exception:
        raise HTTPException(400, "Invalid listing ID format")

    if doc is None:
        raise HTTPException(404, "Listing not found")

    # Convert ObjectId to str for JSON
    doc["_id"] = str(doc["_id"])
    # Convert Decimal128 and datetime fields
    for k, v in doc.items():
        if hasattr(v, "to_decimal"):
            doc[k] = float(str(v))
    return {"listing": doc}
