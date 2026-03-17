"""Export API — CSV, PDF, PNG generation."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.post("/csv")
async def export_csv():
    """Export chart data as CSV."""
    # TODO: Implement
    return {"message": "Not yet implemented"}


@router.post("/pdf")
async def export_pdf():
    """Export chart/report as PDF."""
    # TODO: Implement with ReportLab
    return {"message": "Not yet implemented"}
