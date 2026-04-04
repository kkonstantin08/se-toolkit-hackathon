from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import SchemaModel


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    timezone: str = "UTC"

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Timezone must be a valid IANA timezone, for example Europe/Moscow") from exc
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserResponse(SchemaModel):
    id: str
    email: EmailStr
    full_name: str
    timezone: str
    is_active: bool
    created_at: datetime
