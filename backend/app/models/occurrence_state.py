from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class OccurrenceState(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "occurrence_states"
    __table_args__ = (UniqueConstraint("planner_item_id", "occurrence_date", name="uq_occurrence_item_date"),)

    planner_item_id: Mapped[str] = mapped_column(ForeignKey("planner_items.id", ondelete="CASCADE"), index=True)
    occurrence_date: Mapped[date] = mapped_column(Date)
    completion_status: Mapped[str] = mapped_column(String(32), default="completed")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_skipped: Mapped[bool] = mapped_column(Boolean, default=False)

    planner_item = relationship("PlannerItem", back_populates="occurrence_states")
