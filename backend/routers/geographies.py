"""Geographies API — states, counties, cities, zip codes."""

from fastapi import APIRouter, HTTPException, Query

from db import get_db
from models.mls import (
    MLS_FEEDS,
    fetch_cities_with_counts,
    fetch_counties,
    fetch_zip_codes,
    get_active_states,
    get_feed,
)
from models.schemas import GeoOption

router = APIRouter()


def _resolve_feed(state: str):
    try:
        return get_feed(state)
    except KeyError:
        raise HTTPException(404, f"No MLS feed for state: {state}")


@router.get("/states")
async def get_states():
    """Return list of states with active MLS data."""
    states = get_active_states()
    return {
        "states": [
            GeoOption(value=s, label=s).model_dump()
            for s in states
        ]
    }


@router.get("/counties")
async def get_counties(state: str = Query(..., description="State name")):
    """Return counties for a state."""
    feed = _resolve_feed(state)
    db = get_db()
    counties = await fetch_counties(db, feed)
    return {
        "state": state,
        "counties": [
            GeoOption(value=c, label=c).model_dump()
            for c in counties
        ],
    }


@router.get("/cities")
async def get_cities(state: str = Query(..., description="State name")):
    """Return cities for a state with listing counts."""
    feed = _resolve_feed(state)
    db = get_db()
    cities = await fetch_cities_with_counts(db, feed)
    return {
        "state": state,
        "cities": [
            GeoOption(value=c["city"], label=c["city"], count=c["count"]).model_dump()
            for c in cities
        ],
    }


@router.get("/zips")
async def get_zips(state: str = Query(..., description="State name")):
    """Return zip codes for a state."""
    feed = _resolve_feed(state)
    db = get_db()
    zips = await fetch_zip_codes(db, feed)
    return {
        "state": state,
        "zips": [
            GeoOption(value=z, label=z).model_dump()
            for z in zips
        ],
    }
