from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import utc_now
from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class PlannerItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "planner_items"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    item_type: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    all_day: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    source: Mapped[str] = mapped_column(String(32), default="manual")
    color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_rule_id: Mapped[str | None] = mapped_column(ForeignKey("recurrence_rules.id", ondelete="SET NULL"), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="planner_items")
    recurrence_rule = relationship("RecurrenceRule", back_populates="planner_items")
    reminders = relationship("Reminder", back_populates="planner_item", cascade="all, delete-orphan")
    occurrence_states = relationship("OccurrenceState", back_populates="planner_item", cascade="all, delete-orphan")
    sync_states = relationship("SyncState", back_populates="planner_item", cascade="all, delete-orphan")

