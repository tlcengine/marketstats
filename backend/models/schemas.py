"""Pydantic models for API requests and responses."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


# ── Enums ──
class MetricKey(str, Enum):
    MEDIAN_SALES_PRICE = "MedianSalesPrice"
    NEW_LISTINGS = "NewListings"
    INVENTORY = "Inventory"
    PENDING_SALES = "PendingSales"
    CLOSED_SALES = "ClosedSales"
    DAYS_ON_MARKET = "DaysOnMarket"
    MONTHS_SUPPLY = "MonthsSupply"
    PCT_LIST_PRICE = "PctOfListPrice"
    PRICE_PER_SQFT = "PricePerSqFt"
    DOLLAR_VOLUME = "DollarVolume"
    ABSORPTION_RATE = "AbsorptionRate"
    AVG_SALES_PRICE = "AverageSalesPrice"
    LIST_TO_SALE = "ListToSaleRatio"


class GeoType(str, Enum):
    COUNTY = "County"
    CITY = "City"
    ZIP = "PostalCode"
    MAP = "Map"


class StatType(str, Enum):
    MEDIAN = "Median"
    AVERAGE = "Average"


# ── Response Models ──
class MetricDataPoint(BaseModel):
    date: str  # YYYY-MM format
    value: Optional[float] = None
    count: Optional[int] = None


class MetricSeries(BaseModel):
    name: str  # Area name or breakout label
    data: list[MetricDataPoint]
    color: Optional[str] = None


class MetricResponse(BaseModel):
    metric: MetricKey
    stat_type: StatType
    series: list[MetricSeries]
    y_axis_label: str
    y_axis_format: str  # e.g. "$,.0f" or ".1%"


class QuickFact(BaseModel):
    area_name: str
    latest_value: Optional[float] = None
    previous_value: Optional[float] = None
    yoy_change: Optional[float] = None
    period: Optional[str] = None


class ListingSummary(BaseModel):
    id: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    list_price: Optional[float] = None
    close_price: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[float] = None
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    on_market_date: Optional[str] = None
    photo_url: Optional[str] = None


class ListingsResponse(BaseModel):
    listings: list[ListingSummary]
    total: int
    page: int
    page_size: int


class GeoOption(BaseModel):
    value: str
    label: str
    count: Optional[int] = None


class ReportKPI(BaseModel):
    label: str
    value: str
    change: Optional[str] = None
    direction: Optional[str] = None  # "up", "down", "flat"
