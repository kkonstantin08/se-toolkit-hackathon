from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import utc_now
from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class IntegrationMetadata(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "integration_metadata"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(64), default="google_calendar")
    provider_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    encrypted_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    scopes: Mapped[list[str]] = mapped_column(JSON, default=list)
    default_calendar_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="integrations")
    sync_states = relationship("SyncState", back_populates="integration", cascade="all, delete-orphan")

