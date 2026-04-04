from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator
from zoneinfo import ZoneInfo

from app.schemas.item import ItemCreate
from app.schemas.common import SchemaModel


class ParseRequest(BaseModel):
    raw_text: str = Field(min_length=3, max_length=2000)
    client_timezone: str | None = None

    @field_validator("client_timezone")
    @classmethod
    def validate_timezone(cls, value: str | None) -> str | None:
        if value in (None, ""):
            return None
        try:
            ZoneInfo(value)
        except Exception as exc:  # noqa: BLE001
            raise ValueError("client_timezone must be a valid IANA timezone") from exc
        return value


class ParsedDraftResponse(SchemaModel):
    id: str
    raw_text: str
    parsed_payload_json: dict
    warnings_json: list[str]
    parse_status: str
    parse_source: str
    model_name: str
    confirmed_at: datetime | None
    expires_at: datetime
    created_at: datetime


class ConfirmDraftRequest(BaseModel):
    item: ItemCreate
