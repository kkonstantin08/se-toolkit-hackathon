from __future__ import annotations

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User


def ensure_demo_user() -> None:
    settings = get_settings()
    if not settings.seed_demo_user:
        return

    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == settings.demo_user_email.lower()))
        if existing is not None:
            return

        demo_user = User(
            email=settings.demo_user_email.lower(),
            password_hash=hash_password(settings.demo_user_password),
            full_name=settings.demo_user_full_name,
            timezone=settings.demo_user_timezone,
            is_active=True,
        )
        db.add(demo_user)
        db.commit()
