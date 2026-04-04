from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    database_url: str = "sqlite:///./plansync.db"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    cookie_secure: bool = False
    backend_cors_origins: list[str] | str = Field(default_factory=lambda: ["http://localhost:5173", "http://localhost:8080"])
    frontend_url: str = "http://localhost:8080"
    seed_demo_user: bool = True
    demo_user_email: str = "student@example.com"
    demo_user_password: str = "password123"
    demo_user_full_name: str = "Student Demo"
    demo_user_timezone: str = "UTC"

    mistral_api_key: str | None = None
    mistral_model: str = "mistral-small-latest"

    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str | None = None
    google_calendar_scopes: str = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email"

    @property
    def cors_origins(self) -> list[str]:
        if isinstance(self.backend_cors_origins, str):
            return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]
        return self.backend_cors_origins

    @property
    def google_scopes(self) -> list[str]:
        return [scope for scope in self.google_calendar_scopes.split(" ") if scope]


@lru_cache
def get_settings() -> Settings:
    return Settings()
