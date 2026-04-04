from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import SchemaModel


class GoogleStatusResponse(BaseModel):
    configured: bool = False
    connected: bool
    provider_email: str | None = None
    default_calendar_id: str | None = None
    connected_at: datetime | None = None


class ConnectUrlResponse(BaseModel):
    url: str


class SyncResponse(SchemaModel):
    sync_status: str
    external_object_id: str | None = None
    last_error: str | None = None
    last_synced_at: datetime | None = None
