from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import utc_now
from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    planner_items = relationship("PlannerItem", back_populates="user", cascade="all, delete-orphan")
    parsed_drafts = relationship("ParsedDraft", back_populates="user", cascade="all, delete-orphan")
    integrations = relationship("IntegrationMetadata", back_populates="user", cascade="all, delete-orphan")
    auth_sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")

