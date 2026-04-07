from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import RecurrencePayload, ReminderPayload, SchemaModel


class ItemBase(BaseModel):
    item_type: str = Field(pattern="^(task|event)$")
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    due_at: datetime | None = None
    all_day: bool = False
    status: str | None = None
    source: str = "manual"
    color: str | None = "#3B82F6"
    reminders: list[ReminderPayload] = Field(default_factory=list)
    recurrence: RecurrencePayload | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.item_type == "event" and self.start_at is None:
            raise ValueError("Event must have start_at")
        if self.item_type == "task" and self.due_at is None and self.start_at is None:
            raise ValueError("Task must have due_at or start_at")
        if self.end_at and self.start_at and self.end_at < self.start_at:
            raise ValueError("end_at must be after start_at")
        return self


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    item_type: str | None = Field(default=None, pattern="^(task|event)$")
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    due_at: datetime | None = None
    all_day: bool | None = None
    status: str | None = None
    source: str | None = None
    color: str | None = None
    reminders: list[ReminderPayload] | None = None
    recurrence: RecurrencePayload | None = None


class ItemResponse(SchemaModel):
    id: str
    user_id: str
    item_type: str
    title: str
    description: str | None
    start_at: datetime | None
    end_at: datetime | None
    due_at: datetime | None
    all_day: bool
    status: str
    source: str
    color: str | None
    is_recurring: bool
    created_at: datetime
    updated_at: datetime
    reminders: list[ReminderPayload]
    recurrence: RecurrencePayload | None = None


class CompletionRequest(BaseModel):
    occurrence_date: date | None = None


class DeleteOccurrenceRequest(BaseModel):
    occurrence_date: date


class ItemOccurrenceResponse(ItemResponse):
    occurrence_date: date | None = None
    display_start_at: datetime | None = None
    display_end_at: datetime | None = None
    display_due_at: datetime | None = None
    completed_for_occurrence: bool = False
    sync_status: str | None = None
