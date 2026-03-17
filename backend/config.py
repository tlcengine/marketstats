"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """App configuration — reads from .env file automatically."""

    # MongoDB
    mongodb_username: str = "krish"
    mongodb_password: str = ""
    mongodb_url: str = "172.26.1.151:27017"
    mongodb_database: str = "housing-prices"

    # Google OAuth
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""

    # App
    app_base_url: str = "https://marketstats.certihomes.com"
    session_secret: str = "change-me-in-production"

    # Services
    podcastfy_url: str = "https://podcastfy.certihomes.com"
    claude_proxy_url: str = "http://localhost:8080"

    # CORS
    frontend_url: str = "http://localhost:3000"

    @property
    def mongodb_connection_string(self) -> str:
        if self.mongodb_password:
            return f"mongodb://{self.mongodb_username}:{self.mongodb_password}@{self.mongodb_url}"
        return f"mongodb://{self.mongodb_url}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
