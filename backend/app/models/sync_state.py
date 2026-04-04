from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class SyncState(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "sync_state"
    __table_args__ = (UniqueConstraint("planner_item_id", "integration_id", name="uq_sync_item_integration"),)

    planner_item_id: Mapped[str] = mapped_column(ForeignKey("planner_items.id", ondelete="CASCADE"), index=True)
    integration_id: Mapped[str] = mapped_column(ForeignKey("integration_metadata.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(64), default="google_calendar")
    external_object_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sync_status: Mapped[str] = mapped_column(String(32), default="pending")
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    planner_item = relationship("PlannerItem", back_populates="sync_states")
    integration = relationship("IntegrationMetadata", back_populates="sync_states")

