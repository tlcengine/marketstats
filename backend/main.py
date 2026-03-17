"""MarketStats API — FastAPI entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from db import close_db
from routers import metrics, listings, geographies, export, report


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    yield
    await close_db()


settings = get_settings()

app = FastAPI(
    title="MarketStats API",
    description="Real Estate Market Intelligence by CertiHomes",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])
app.include_router(listings.router, prefix="/api/listings", tags=["Listings"])
app.include_router(geographies.router, prefix="/api/geographies", tags=["Geographies"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(report.router, prefix="/api/report", tags=["Report"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "marketstats-api"}
