from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class SchemaModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str


class ReminderPayload(SchemaModel):
    id: str | None = None
    trigger_mode: str
    offset_minutes: int | None = None
    absolute_trigger_at: datetime | None = None
    channel: str = "in_app"
    is_enabled: bool = True
    last_fired_at: datetime | None = None


class RecurrencePayload(SchemaModel):
    id: str | None = None
    frequency: str
    interval: int = 1
    by_weekdays: list[int] | None = None
    day_of_month: int | None = None
    ends_on: date | None = None
    occurrence_count: int | None = None
    timezone: str = "UTC"

