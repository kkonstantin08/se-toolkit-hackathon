from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class RecurrenceRule(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "recurrence_rules"

    frequency: Mapped[str] = mapped_column(String(32))
    interval: Mapped[int] = mapped_column(Integer, default=1)
    by_weekdays: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)
    day_of_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    occurrence_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")

    planner_items = relationship("PlannerItem", back_populates="recurrence_rule")

