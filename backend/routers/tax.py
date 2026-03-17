"""Tax API — property tax assessment data and predictions."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from db import get_db

router = APIRouter()

# ── Property class labels ──
PROPERTY_CLASSES = {
    "1": "Vacant Land",
    "2": "Residential (4 families or less)",
    "3A": "Farm (regular)",
    "3B": "Farm (qualified)",
    "4A": "Commercial",
    "4B": "Industrial",
    "4C": "Apartment (5+ families)",
}


# ── Response models ──

class TaxSummary(BaseModel):
    total_properties: int = 0
    median_net_value: Optional[float] = None
    median_tax: Optional[float] = None
    avg_tax: Optional[float] = None
    avg_net_value: Optional[float] = None
    total_land_value: Optional[float] = None
    total_improvement_value: Optional[float] = None
    effective_rate: Optional[float] = None


class PropertyClassCount(BaseModel):
    property_class: str
    label: str
    count: int


class TaxDistributionBucket(BaseModel):
    bucket_min: float
    bucket_max: float
    count: int


class CountyRate(BaseModel):
    county: str
    effective_rate: float
    avg_tax: float
    avg_net_value: float
    count: int


class TaxRecord(BaseModel):
    property_location: Optional[str] = None
    city_state: Optional[str] = None
    county: Optional[str] = None
    net_value: Optional[float] = None
    calculated_tax: Optional[float] = None
    land_value: Optional[float] = None
    improvement_value: Optional[float] = None
    property_class: Optional[str] = None
    year_constructed: Optional[float] = None
    block: Optional[str] = None
    lot: Optional[str] = None
    zip_code: Optional[str] = None
    year_assessed: Optional[int] = None
    sale_price: Optional[float] = None


class TaxPredictionRequest(BaseModel):
    county: str
    municipality: Optional[str] = None
    property_class: str = "2"
    current_value: Optional[float] = None
    bedrooms: Optional[int] = None
    sqft: Optional[float] = None
    year_built: Optional[int] = None
    lot_size: Optional[float] = None


class ComparableProperty(BaseModel):
    address: Optional[str] = None
    city: Optional[str] = None
    net_value: float
    calculated_tax: float
    effective_rate: float
    year_constructed: Optional[int] = None


class TaxPrediction(BaseModel):
    predicted_tax: float
    predicted_assessment: float
    effective_rate: float
    confidence: str  # "high", "medium", "low"
    comparable_count: int
    median_area_tax: float
    median_area_value: float
    comparables: list[ComparableProperty]
    low_estimate: float
    high_estimate: float


# ── Endpoints ──

@router.get("/counties")
async def get_tax_counties():
    """Return sorted list of counties in tax-assessment-data."""
    db = get_db()
    counties = await db["tax-assessment-data"].distinct("county")
    counties = sorted([c for c in counties if c])
    return {"counties": counties}


@router.get("/municipalities")
async def get_tax_municipalities(county: str = Query(...)):
    """Return sorted list of municipalities for a county."""
    db = get_db()
    munis = await db["tax-assessment-data"].distinct(
        "city_state", {"county": county.lower()}
    )
    munis = sorted([m for m in munis if m])
    return {"county": county, "municipalities": munis}


@router.get("/summary")
async def get_tax_summary(
    county: str = Query(...),
    municipality: Optional[str] = Query(None),
):
    """Aggregated summary metrics for a county or municipality."""
    db = get_db()
    match_filter: dict = {"county": county.lower()}
    if municipality:
        match_filter["city_state"] = municipality

    pipeline = [
        {"$match": match_filter},
        {
            "$group": {
                "_id": None,
                "total_properties": {"$sum": 1},
                "median_net_value": {
                    "$median": {"input": "$net_value", "method": "approximate"}
                },
                "median_tax": {
                    "$median": {
                        "input": "$calculated_tax",
                        "method": "approximate",
                    }
                },
                "avg_tax": {"$avg": "$calculated_tax"},
                "avg_net_value": {"$avg": "$net_value"},
                "total_land_value": {"$sum": "$land_value"},
                "total_improvement_value": {"$sum": "$improvement_value"},
            }
        },
    ]
    results = await db["tax-assessment-data"].aggregate(
        pipeline, allowDiskUse=True
    ).to_list(1)

    if not results:
        raise HTTPException(404, "No data found for the selected geography")

    r = results[0]
    avg_net = r.get("avg_net_value") or 0
    avg_tax = r.get("avg_tax") or 0
    eff_rate = (avg_tax / avg_net * 100) if avg_net > 0 else None

    return TaxSummary(
        total_properties=r.get("total_properties", 0),
        median_net_value=r.get("median_net_value"),
        median_tax=r.get("median_tax"),
        avg_tax=r.get("avg_tax"),
        avg_net_value=r.get("avg_net_value"),
        total_land_value=r.get("total_land_value"),
        total_improvement_value=r.get("total_improvement_value"),
        effective_rate=eff_rate,
    )


@router.get("/property-classes")
async def get_property_class_counts(
    county: str = Query(...),
    municipality: Optional[str] = Query(None),
):
    """Property count by property_class."""
    db = get_db()
    match_filter: dict = {"county": county.lower()}
    if municipality:
        match_filter["city_state"] = municipality

    pipeline = [
        {"$match": match_filter},
        {"$group": {"_id": "$property_class", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    results = await db["tax-assessment-data"].aggregate(
        pipeline, allowDiskUse=True
    ).to_list(50)

    return {
        "classes": [
            PropertyClassCount(
                property_class=str(r["_id"]).strip() if r["_id"] else "Unknown",
                label=PROPERTY_CLASSES.get(
                    str(r["_id"]).strip(), str(r["_id"])
                )
                if r["_id"]
                else "Unknown",
                count=r["count"],
            ).model_dump()
            for r in results
        ]
    }


@router.get("/distribution")
async def get_assessment_distribution(
    county: str = Query(...),
    municipality: Optional[str] = Query(None),
    field: str = Query("net_value", description="Field to get distribution for"),
    buckets: int = Query(20, ge=5, le=100),
):
    """Return histogram bucket data for assessed value or tax distribution."""
    db = get_db()
    match_filter: dict = {"county": county.lower(), field: {"$gt": 0}}
    if municipality:
        match_filter["city_state"] = municipality

    # Get min/max
    bounds_pipeline = [
        {"$match": match_filter},
        {
            "$group": {
                "_id": None,
                "min_val": {"$min": f"${field}"},
                "max_val": {"$max": f"${field}"},
            }
        },
    ]
    bounds = await db["tax-assessment-data"].aggregate(
        bounds_pipeline, allowDiskUse=True
    ).to_list(1)

    if not bounds:
        return {"buckets": [], "field": field}

    min_val = bounds[0]["min_val"] or 0
    max_val = bounds[0]["max_val"] or 1
    # Use 99th percentile to avoid extreme outliers
    pct_pipeline = [
        {"$match": match_filter},
        {"$sample": {"size": 10000}},
        {"$sort": {field: 1}},
        {
            "$group": {
                "_id": None,
                "values": {"$push": f"${field}"},
            }
        },
    ]
    pct_result = await db["tax-assessment-data"].aggregate(
        pct_pipeline, allowDiskUse=True
    ).to_list(1)

    if pct_result and pct_result[0]["values"]:
        vals = sorted(pct_result[0]["values"])
        p99_idx = int(len(vals) * 0.99)
        max_val = vals[p99_idx] if p99_idx < len(vals) else max_val

    bucket_size = (max_val - min_val) / buckets
    if bucket_size <= 0:
        return {"buckets": [], "field": field}

    bucket_pipeline = [
        {"$match": {**match_filter, field: {"$gt": 0, "$lte": max_val}}},
        {
            "$bucket": {
                "groupBy": f"${field}",
                "boundaries": [
                    min_val + i * bucket_size for i in range(buckets + 1)
                ],
                "default": "other",
                "output": {"count": {"$sum": 1}},
            }
        },
    ]

    try:
        bucket_results = await db["tax-assessment-data"].aggregate(
            bucket_pipeline, allowDiskUse=True
        ).to_list(buckets + 1)
    except Exception:
        return {"buckets": [], "field": field}

    response_buckets = []
    for r in bucket_results:
        if r["_id"] == "other":
            continue
        b_min = r["_id"]
        b_max = b_min + bucket_size
        response_buckets.append(
            TaxDistributionBucket(
                bucket_min=round(b_min, 2),
                bucket_max=round(b_max, 2),
                count=r["count"],
            ).model_dump()
        )

    return {"buckets": response_buckets, "field": field}


@router.get("/effective-rates")
async def get_effective_rates_by_county():
    """Effective tax rate by county."""
    db = get_db()
    pipeline = [
        {"$match": {"net_value": {"$gt": 0}, "calculated_tax": {"$gt": 0}}},
        {
            "$group": {
                "_id": "$county",
                "avg_tax": {"$avg": "$calculated_tax"},
                "avg_net_value": {"$avg": "$net_value"},
                "median_tax": {
                    "$median": {
                        "input": "$calculated_tax",
                        "method": "approximate",
                    }
                },
                "median_net_value": {
                    "$median": {
                        "input": "$net_value",
                        "method": "approximate",
                    }
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    results = await db["tax-assessment-data"].aggregate(
        pipeline, allowDiskUse=True
    ).to_list(100)

    return {
        "rates": [
            CountyRate(
                county=r["_id"].title() if r["_id"] else "Unknown",
                effective_rate=round(
                    (r["avg_tax"] / r["avg_net_value"] * 100)
                    if r["avg_net_value"] > 0
                    else 0,
                    2,
                ),
                avg_tax=round(r["avg_tax"], 2),
                avg_net_value=round(r["avg_net_value"], 2),
                count=r["count"],
            ).model_dump()
            for r in results
            if r["_id"]
        ]
    }


@router.get("/search")
async def search_property(
    query: str = Query(..., min_length=3),
    county: Optional[str] = Query(None),
    limit: int = Query(20, le=50),
):
    """Search for properties by address."""
    db = get_db()
    match_filter: dict = {
        "property_location": {"$regex": query.upper(), "$options": "i"}
    }
    if county:
        match_filter["county"] = county.lower()

    results = (
        await db["tax-assessment-data"]
        .find(match_filter)
        .limit(limit)
        .to_list(limit)
    )

    if not results:
        # Try street_address fallback
        match_filter2: dict = {
            "street_address": {"$regex": query.upper(), "$options": "i"}
        }
        if county:
            match_filter2["county"] = county.lower()
        results = (
            await db["tax-assessment-data"]
            .find(match_filter2)
            .limit(limit)
            .to_list(limit)
        )

    return {
        "results": [
            TaxRecord(
                property_location=r.get("property_location"),
                city_state=r.get("city_state"),
                county=r.get("county"),
                net_value=r.get("net_value"),
                calculated_tax=r.get("calculated_tax"),
                land_value=r.get("land_value"),
                improvement_value=r.get("improvement_value"),
                property_class=str(r.get("property_class", "")).strip(),
                year_constructed=r.get("year_constructed"),
                block=r.get("block"),
                lot=r.get("lot"),
                zip_code=r.get("zip_code"),
                year_assessed=r.get("year_assessed"),
                sale_price=r.get("sale_price"),
            ).model_dump()
            for r in results
        ],
        "total": len(results),
    }


@router.post("/predict")
async def predict_tax(req: TaxPredictionRequest):
    """Predict tax based on comparable properties in the area."""
    db = get_db()

    match_filter: dict = {
        "county": req.county.lower(),
        "property_class": req.property_class,
        "net_value": {"$gt": 0},
        "calculated_tax": {"$gt": 0},
    }
    if req.municipality:
        match_filter["city_state"] = {
            "$regex": f"^{req.municipality}",
            "$options": "i",
        }

    # Narrow comparables if we have details
    if req.year_built and req.year_built > 1700:
        match_filter["year_constructed"] = {
            "$gte": req.year_built - 15,
            "$lte": req.year_built + 15,
        }

    # Get comparable properties
    pipeline = [
        {"$match": match_filter},
        {"$sample": {"size": 200}},
        {
            "$project": {
                "_id": 0,
                "property_location": 1,
                "city_state": 1,
                "net_value": 1,
                "calculated_tax": 1,
                "year_constructed": 1,
            }
        },
    ]

    comps = await db["tax-assessment-data"].aggregate(
        pipeline, allowDiskUse=True
    ).to_list(200)

    if not comps:
        raise HTTPException(404, "Not enough comparable properties found")

    # Calculate stats from comparables
    values = [c["net_value"] for c in comps if c.get("net_value")]
    taxes = [c["calculated_tax"] for c in comps if c.get("calculated_tax")]

    if not values or not taxes:
        raise HTTPException(404, "Not enough data for prediction")

    values.sort()
    taxes.sort()

    median_value = values[len(values) // 2]
    median_tax = taxes[len(taxes) // 2]

    # Effective rate from comparables
    rates = [
        c["calculated_tax"] / c["net_value"] * 100
        for c in comps
        if c.get("net_value", 0) > 0 and c.get("calculated_tax", 0) > 0
    ]
    rates.sort()
    median_rate = rates[len(rates) // 2] if rates else 0

    # Predict based on input value or median
    base_value = req.current_value if req.current_value else median_value
    predicted_tax = base_value * median_rate / 100

    # Confidence bands from quartiles
    q25_tax = taxes[len(taxes) // 4] if len(taxes) >= 4 else taxes[0]
    q75_tax = taxes[3 * len(taxes) // 4] if len(taxes) >= 4 else taxes[-1]

    if req.current_value:
        q25_rate = rates[len(rates) // 4] if len(rates) >= 4 else rates[0]
        q75_rate = (
            rates[3 * len(rates) // 4] if len(rates) >= 4 else rates[-1]
        )
        low_estimate = base_value * q25_rate / 100
        high_estimate = base_value * q75_rate / 100
    else:
        low_estimate = q25_tax
        high_estimate = q75_tax

    confidence = "high" if len(comps) >= 50 else "medium" if len(comps) >= 20 else "low"

    # Top 5 comparables for display
    top_comps = comps[:5]
    comparable_list = [
        ComparableProperty(
            address=c.get("property_location"),
            city=c.get("city_state"),
            net_value=c["net_value"],
            calculated_tax=c["calculated_tax"],
            effective_rate=round(
                c["calculated_tax"] / c["net_value"] * 100, 2
            )
            if c.get("net_value", 0) > 0
            else 0,
            year_constructed=int(c["year_constructed"])
            if c.get("year_constructed") and c["year_constructed"] > 0
            else None,
        )
        for c in top_comps
    ]

    return TaxPrediction(
        predicted_tax=round(predicted_tax, 2),
        predicted_assessment=round(base_value, 2),
        effective_rate=round(median_rate, 2),
        confidence=confidence,
        comparable_count=len(comps),
        median_area_tax=round(median_tax, 2),
        median_area_value=round(median_value, 2),
        comparables=comparable_list,
        low_estimate=round(low_estimate, 2),
        high_estimate=round(high_estimate, 2),
    )
