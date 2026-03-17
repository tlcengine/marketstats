"""Branding API — agent profile and branding settings."""

from __future__ import annotations

import base64
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from db import get_db

router = APIRouter()

BRANDING_COLLECTION = "user-branding"


class BrandingProfile(BaseModel):
    agent_name: str = ""
    title: str = ""
    company_name: str = ""
    phone: str = ""
    email: str = ""
    website: str = ""
    headshot_data: Optional[str] = None  # base64-encoded image
    headshot_mime: Optional[str] = None
    logo_data: Optional[str] = None  # base64-encoded image
    logo_mime: Optional[str] = None
    updated_at: Optional[str] = None


@router.get("/")
async def get_branding(user_email: str = "default"):
    """Get branding profile for a user."""
    db = get_db()
    coll = db[BRANDING_COLLECTION]

    doc = await coll.find_one(
        {"user_email": user_email},
        {"_id": 0, "user_email": 0},
    )

    if doc is None:
        return BrandingProfile().model_dump()

    return doc


@router.post("/")
async def save_branding(
    user_email: str = Form(default="default"),
    agent_name: str = Form(default=""),
    title: str = Form(default=""),
    company_name: str = Form(default=""),
    phone: str = Form(default=""),
    email: str = Form(default=""),
    website: str = Form(default=""),
    headshot: Optional[UploadFile] = File(default=None),
    logo: Optional[UploadFile] = File(default=None),
):
    """Save branding profile for a user."""
    db = get_db()
    coll = db[BRANDING_COLLECTION]

    # Build update document
    update_doc = {
        "user_email": user_email,
        "agent_name": agent_name,
        "title": title,
        "company_name": company_name,
        "phone": phone,
        "email": email,
        "website": website,
        "updated_at": datetime.now().isoformat(),
    }

    # Process headshot upload
    if headshot and headshot.filename:
        content = await headshot.read()
        update_doc["headshot_data"] = base64.b64encode(content).decode("utf-8")
        update_doc["headshot_mime"] = headshot.content_type or "image/jpeg"

    # Process logo upload
    if logo and logo.filename:
        content = await logo.read()
        update_doc["logo_data"] = base64.b64encode(content).decode("utf-8")
        update_doc["logo_mime"] = logo.content_type or "image/png"

    # Upsert
    await coll.update_one(
        {"user_email": user_email},
        {"$set": update_doc},
        upsert=True,
    )

    return {"status": "saved", "message": "Branding profile updated successfully."}


@router.delete("/")
async def delete_branding(user_email: str = "default"):
    """Delete branding profile for a user."""
    db = get_db()
    coll = db[BRANDING_COLLECTION]

    result = await coll.delete_one({"user_email": user_email})
    if result.deleted_count == 0:
        raise HTTPException(404, "No branding profile found")

    return {"status": "deleted", "message": "Branding profile removed."}
