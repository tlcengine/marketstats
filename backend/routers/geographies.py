"""Geographies API — states, counties, cities, zip codes."""

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()


@router.get("/states")
async def get_states():
    """Return list of states with active MLS data."""
    # TODO: Port from MLS.getMLSs()
    return {"states": ["New Jersey", "Georgia"]}


@router.get("/counties")
async def get_counties(state: str = Query(...)):
    """Return counties for a state."""
    return {"state": state, "counties": []}


@router.get("/cities")
async def get_cities(state: str = Query(...)):
    """Return cities for a state with listing counts."""
    return {"state": state, "cities": []}


@router.get("/zips")
async def get_zips(state: str = Query(...)):
    """Return zip codes for a state."""
    return {"state": state, "zips": []}
