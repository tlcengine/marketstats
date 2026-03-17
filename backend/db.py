"""Async MongoDB connection using Motor."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import get_settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    """Get or create the Motor client (singleton)."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(settings.mongodb_connection_string)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    """Get the housing-prices database."""
    settings = get_settings()
    return get_client()[settings.mongodb_database]


async def close_db():
    """Close the MongoDB connection."""
    global _client
    if _client:
        _client.close()
        _client = None
