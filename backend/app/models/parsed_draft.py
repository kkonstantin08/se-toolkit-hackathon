from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import utc_now
from app.db.base import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class ParsedDraft(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "parsed_drafts"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    raw_text: Mapped[str] = mapped_column(Text)
    parsed_payload_json: Mapped[dict] = mapped_column(JSON)
    warnings_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    parse_status: Mapped[str] = mapped_column(String(32), default="parsed")
    parse_source: Mapped[str] = mapped_column(String(32), default="fallback")
    model_name: Mapped[str] = mapped_column(String(128))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="parsed_drafts")
