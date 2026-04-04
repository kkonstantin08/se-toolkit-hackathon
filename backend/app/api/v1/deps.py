from __future__ import annotations

from fastapi import Cookie, Depends, Header, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services.auth import resolve_user_from_access_token


def get_current_user(
    db: Session = Depends(get_db),
    access_token: str | None = Cookie(default=None, alias="plansync_access_token"),
) -> User:
    return resolve_user_from_access_token(db, access_token)


def get_client_meta(request: Request, user_agent: str | None = Header(default=None)):
    return {
        "user_agent": user_agent,
        "ip_address": request.client.host if request.client else None,
    }

