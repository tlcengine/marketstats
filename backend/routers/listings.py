"""Listings API — browse and filter MLS listings."""

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()


@router.get("/")
async def get_listings(
    state: str = Query(...),
    geo_type: Optional[str] = Query(None),
    geo_values: Optional[str] = Query(None),
    status: str = Query("Active"),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    property_type: Optional[str] = Query(None),
    bedrooms: Optional[int] = Query(None),
    page: int = Query(1),
    page_size: int = Query(50),
):
    """Return paginated listings with filters."""
    # TODO: Port from MLS.py getListings
    return {"listings": [], "total": 0, "page": page, "page_size": page_size}


@router.get("/{listing_id}")
async def get_listing(listing_id: str):
    """Return a single listing by ID."""
    # TODO: Implement
    return {"listing_id": listing_id, "data": None}
