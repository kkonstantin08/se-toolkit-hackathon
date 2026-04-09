from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_client_meta, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse
from app.schemas.common import MessageResponse
from app.services import auth as auth_service

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    response: Response,
    client_meta: dict = Depends(get_client_meta),
    db: Session = Depends(get_db),
):
    user = auth_service.register_user(db, payload)
    auth_service.create_session_tokens(db, response, user, client_meta["user_agent"], client_meta["ip_address"])
    return UserResponse.model_validate(user)


@router.post("/login", response_model=UserResponse)
def login(
    payload: LoginRequest,
    response: Response,
    client_meta: dict = Depends(get_client_meta),
    db: Session = Depends(get_db),
):
    user = auth_service.authenticate_user(db, payload)
    auth_service.create_session_tokens(db, response, user, client_meta["user_agent"], client_meta["ip_address"])
    return UserResponse.model_validate(user)


@router.post("/refresh", response_model=UserResponse)
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias="plansync_refresh_token"),
    client_meta: dict = Depends(get_client_meta),
    db: Session = Depends(get_db),
):
    user = auth_service.rotate_refresh_session(db, response, refresh_token, client_meta["user_agent"], client_meta["ip_address"])
    return UserResponse.model_validate(user)


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias="plansync_refresh_token"),
    db: Session = Depends(get_db),
):
    auth_service.logout(db, response, refresh_token)
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
