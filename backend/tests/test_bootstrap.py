from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.user import User
from app.services.bootstrap import ensure_demo_user


def test_demo_user_is_seeded(monkeypatch):
    monkeypatch.setenv("SEED_DEMO_USER", "true")
    get_settings.cache_clear()

    ensure_demo_user()

    with SessionLocal() as db:
        demo_user = db.scalar(select(User).where(User.email == "student@example.com"))

    assert demo_user is not None
    assert demo_user.full_name == "Student Demo"

    get_settings.cache_clear()

