"""Constants ported from dashboard/constants.py."""

MAX_YEARS = 20

# Metric display name -> internal column name used in DataFrames
METRIC_TO_COLUMN: dict[str, str] = {
    "MedianSalesPrice": "Sales Price",
    "AverageSalesPrice": "Sales Price",
    "NewListings": "New Listings",
    "ClosedSales": "Closed Sales",
    "Inventory": "Homes for Sale",
    "PendingSales": "Pending Sales",
    "DaysOnMarket": "Days on Market",
    "PricePerSqFt": "Price Per Sq Ft",
    "OriginalListPrice": "Original List Price",
    "PctOfListPrice": "Percent of Original List Price",
    "ListToSaleRatio": "Percent of Last List Price",
    "DollarVolume": "Dollar Volume",
    "AbsorptionRate": "Absorption Rate",
    "MonthsSupply": "Months Supply",
    "ShowsToPending": "Shows to Pending",
    "ShowsPerListing": "Shows Per Listing",
}

# Y-axis format strings (keyed by internal column name)
AXIS_FORMATS: dict[str, str] = {
    "Sales Price": "$~s",
    "Dollar Volume": "$~s",
    "Original List Price": "$~s",
    "Price Per Sq Ft": "$~s",
    "New Listings": "~s",
    "Homes for Sale": "~s",
    "Pending Sales": "~s",
    "Closed Sales": "~s",
    "Days on Market": "f",
    "Months Supply": "f",
    "Absorption Rate": "%",
    "Percent of Original List Price": "%",
    "Percent of Last List Price": "%",
    "Shows to Pending": "f",
    "Shows Per Listing": "f",
}

# Human-readable metric labels
METRIC_LABELS: dict[str, str] = {
    "MedianSalesPrice": "Median Sales Price",
    "AverageSalesPrice": "Average Sales Price",
    "NewListings": "New Listings",
    "ClosedSales": "Closed Sales",
    "Inventory": "Homes for Sale",
    "PendingSales": "Pending Sales",
    "DaysOnMarket": "Median Days on Market",
    "PricePerSqFt": "Price Per Sq Ft",
    "OriginalListPrice": "Original List Price",
    "PctOfListPrice": "Pct of Original Price",
    "ListToSaleRatio": "Pct of Last List Price",
    "DollarVolume": "Dollar Volume",
    "AbsorptionRate": "Absorption Rate",
    "MonthsSupply": "Months Supply",
    "ShowsToPending": "Shows to Pending",
    "ShowsPerListing": "Shows Per Listing",
}

CLOSED_STATUSES = frozenset({
    "Closed", "Sold", "Expired", "Canceled", "Cancelled",
    "Killed", "Under Agreement", "Rented", "Deposit",
    "S-Closed/Rented", "T-Temp Off Market", "X-Expired",
    "Sold-REO", "Rented-Leased", "Sold-Short Sale", "Withdrawn",
})

# Price range filter buckets
PRICE_RANGES = [
    ("All Prices", 0, 999_999_999),
    ("$208,999 or Less", 0, 208_999),
    ("$209,000 to $288,999", 209_000, 288_999),
    ("$289,000 to $409,999", 289_000, 409_999),
    ("$410,000 to $599,999", 410_000, 599_999),
    ("$600,000 or More", 600_000, 999_999_999),
]

# Bedroom buckets
BEDROOM_RANGES = [
    ("All Bedrooms", 0, 99),
    ("1 or Fewer", 0, 1),
    ("2 Bedrooms", 2, 2),
    ("3 Bedrooms", 3, 3),
    ("4 Bedrooms", 4, 4),
    ("5+ Bedrooms", 5, 99),
]

# Bathroom buckets
BATHROOM_RANGES = [
    ("All Bathrooms", 0, 99),
    ("1 or Fewer", 0, 1),
    ("2 Bathrooms", 2, 2),
    ("3 Bathrooms", 3, 3),
    ("4 or More", 4, 99),
]
