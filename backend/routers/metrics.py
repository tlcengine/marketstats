"""Metrics API — time-series market data for charts."""

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()


@router.get("/")
async def get_metrics(
    state: str = Query(..., description="State name"),
    metric: str = Query("MedianSalesPrice", description="Metric key"),
    geo_type: Optional[str] = Query(None, description="County, City, or PostalCode"),
    geo_values: Optional[str] = Query(None, description="Comma-separated geo values"),
    years: int = Query(5, description="Number of years of data"),
    rolling: int = Query(1, description="Rolling average window (months)"),
    stat_type: str = Query("Median", description="Median or Average"),
):
    """Return time-series metric data for charting."""
    # TODO: Port from dashboard/data_generators.py
    return {
        "metric": metric,
        "state": state,
        "data": [],
        "message": "Not yet implemented — port from Streamlit data_generators.py",
    }


@router.get("/quick-facts")
async def get_quick_facts(
    state: str = Query(...),
    metric: str = Query("MedianSalesPrice"),
    geo_type: Optional[str] = Query(None),
    geo_values: Optional[str] = Query(None),
):
    """Return latest value + YoY change for quick facts panel."""
    # TODO: Implement
    return {"metric": metric, "latest_value": None, "yoy_change": None}
