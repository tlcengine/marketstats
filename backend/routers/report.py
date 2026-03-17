"""Report API — market report data and narrative."""

from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/")
async def get_report(
    city: str = Query(...),
    state: str = Query(...),
):
    """Return market report data for a city."""
    # TODO: Port from pages/11_Market_Report.py
    return {
        "city": city,
        "state": state,
        "kpis": {},
        "narrative": None,
        "podcast_url": None,
    }


@router.get("/featured-cities")
async def get_featured_cities():
    """Return list of featured cities for pre-generated reports."""
    return {
        "cities": [
            {"city": "Edison", "state": "New Jersey"},
            {"city": "Princeton", "state": "New Jersey"},
            {"city": "Monroe", "state": "New Jersey"},
        ]
    }
