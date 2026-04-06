"""
PrüfPilot - Application Configuration
"""
import json
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "PrüfPilot"
    APP_ENV: str = "development"
    APP_URL: str = "http://localhost:5173"
    API_URL: str = "http://localhost:8000"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://pruefpilot:pruefpilot_dev@localhost:5432/pruefpilot"
    DATABASE_URL_SYNC: str = "postgresql://pruefpilot:pruefpilot_dev@localhost:5432/pruefpilot"

    # JWT Auth
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS — unterstützt JSON-Array oder Komma-getrennte Strings
    # Typ ist str damit pydantic-settings v2 nicht vorab JSON-parst
    CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:3000","https://pruefpilot.vercel.app"]'

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS to list: JSON-Array oder Komma-getrennte Strings."""
        v = self.CORS_ORIGINS
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, TypeError):
                pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return [str(v)]

    # S3 Storage
    S3_ENDPOINT: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET: str = "pruefpilot-files"

    # Email
    POSTMARK_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@pruefpilot.de"

    # AI
    ANTHROPIC_API_KEY: str = ""

    # Sentry
    SENTRY_DSN: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
