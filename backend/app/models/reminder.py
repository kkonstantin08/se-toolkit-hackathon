from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class Reminder(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "reminders"

    planner_item_id: Mapped[str] = mapped_column(ForeignKey("planner_items.id", ondelete="CASCADE"), index=True)
    trigger_mode: Mapped[str] = mapped_column(String(16), default="relative")
    offset_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    absolute_trigger_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    channel: Mapped[str] = mapped_column(String(16), default="in_app")
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_fired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    planner_item = relationship("PlannerItem", back_populates="reminders")

