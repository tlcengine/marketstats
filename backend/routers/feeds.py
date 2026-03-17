"""Feeds API — MLS feed status and management."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_db

router = APIRouter()


# ── MLS Feed Registry (mirrors the Streamlit config.py) ──

MLS_FEEDS_REGISTRY = {
    "bridge_cjmls": {
        "name": "CJMLS (New Jersey)",
        "provider": "Bridge Interactive",
        "method": "RESO Web API",
        "state": "NJ",
        "collection": "bridge-cjmls",
        "enabled": True,
        "status": "active",
        "disabled_reason": None,
    },
    "bridge_fmls": {
        "name": "FMLS (Georgia)",
        "provider": "Bridge Interactive",
        "method": "RESO Web API",
        "state": "GA",
        "collection": "bridge-fmls",
        "enabled": True,
        "status": "active",
        "disabled_reason": None,
    },
    "trestle_ny": {
        "name": "Trestle (New York)",
        "provider": "CoreLogic Trestle",
        "method": "OAuth 2.0",
        "state": "NY",
        "collection": "trestle",
        "enabled": False,
        "status": "stale",
        "disabled_reason": "invalid_client - OAuth credentials expired/revoked (2026-03)",
    },
    "mlspin": {
        "name": "MLSPIN (Massachusetts)",
        "provider": "Bridge RETS",
        "method": "RETS",
        "state": "MA",
        "collection": "mlspin",
        "enabled": False,
        "status": "broken",
        "disabled_reason": "401 Unauthorized - credentials expired (2026-03)",
    },
    "ctmls": {
        "name": "CTMLS (Connecticut)",
        "provider": "SmartMLS Matrix",
        "method": "RETS",
        "state": "CT",
        "collection": "ctmls",
        "enabled": False,
        "status": "broken",
        "disabled_reason": "401 Unauthorized - credentials expired (2026-03)",
    },
    "mlsgrid": {
        "name": "MLSGrid (Illinois)",
        "provider": "MLS Grid",
        "method": "REST API",
        "state": "IL",
        "collection": "mlsgrid",
        "enabled": False,
        "status": "broken",
        "disabled_reason": "403 No MLS Set - subscription inactive (2026-03)",
    },
    "mlsmatrix": {
        "name": "MLSMatrix (New York alt)",
        "provider": "MLS Matrix",
        "method": "RETS",
        "state": "NY",
        "collection": None,
        "enabled": False,
        "status": "broken",
        "disabled_reason": "401 Unauthorized - credentials expired (2026-03)",
    },
    "paragon": {
        "name": "Paragon (California)",
        "provider": "Paragon RETS",
        "method": "RETS",
        "state": "CA",
        "collection": "paragon",
        "enabled": False,
        "status": "broken",
        "disabled_reason": "401 Unauthorized - credentials expired (2026-03)",
    },
    "rebny": {
        "name": "REBNY (NYC)",
        "provider": "REBNY",
        "method": "Token API",
        "state": "NY",
        "collection": "rebny",
        "enabled": False,
        "status": "broken",
        "disabled_reason": "403 Access token not found (2026-03)",
    },
}


class FeedStatus(BaseModel):
    key: str
    name: str
    provider: str
    method: str
    state: str
    status: str  # "active", "stale", "broken"
    enabled: bool
    doc_count: Optional[int] = None
    last_sync: Optional[str] = None
    disabled_reason: Optional[str] = None


@router.get("/")
async def list_feeds():
    """Return status of all MLS feeds with document counts."""
    db = get_db()
    feeds = []

    for key, config in MLS_FEEDS_REGISTRY.items():
        doc_count = None
        last_sync = None

        collection_name = config.get("collection")
        if collection_name:
            try:
                coll = db[collection_name]
                doc_count = await coll.estimated_document_count()

                # Get last sync from most recent ModificationTimestamp
                latest = await coll.find_one(
                    sort=[("ModificationTimestamp", -1)],
                    projection={"ModificationTimestamp": 1},
                )
                if latest and "ModificationTimestamp" in latest:
                    ts = latest["ModificationTimestamp"]
                    if isinstance(ts, datetime):
                        last_sync = ts.strftime("%Y-%m-%d %H:%M:%S")
                    else:
                        last_sync = str(ts)
            except Exception:
                pass

        feeds.append(FeedStatus(
            key=key,
            name=config["name"],
            provider=config["provider"],
            method=config["method"],
            state=config["state"],
            status=config["status"],
            enabled=config["enabled"],
            doc_count=doc_count,
            last_sync=last_sync,
            disabled_reason=config.get("disabled_reason"),
        ))

    # Summary stats
    active_count = sum(1 for f in feeds if f.enabled)
    total_docs = sum(f.doc_count or 0 for f in feeds)

    return {
        "feeds": [f.model_dump() for f in feeds],
        "summary": {
            "total_feeds": len(feeds),
            "active_feeds": active_count,
            "total_documents": total_docs,
        },
    }


@router.post("/{feed_key}/sync")
async def trigger_sync(feed_key: str):
    """Trigger a manual sync for a feed (placeholder)."""
    if feed_key not in MLS_FEEDS_REGISTRY:
        raise HTTPException(404, f"Unknown feed: {feed_key}")

    config = MLS_FEEDS_REGISTRY[feed_key]
    if not config["enabled"]:
        raise HTTPException(400, f"Feed {feed_key} is disabled: {config.get('disabled_reason', 'Unknown')}")

    # In production this would trigger the ETL subprocess
    # For now return an acknowledgment
    return {
        "status": "queued",
        "feed": feed_key,
        "message": f"Sync triggered for {config['name']}. This may take several minutes.",
    }
