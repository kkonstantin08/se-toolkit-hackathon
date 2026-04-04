from __future__ import annotations

import base64
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from cryptography.fernet import Fernet
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import get_settings

password_hash = PasswordHash((BcryptHasher(),))


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, password_hash_value: str) -> bool:
    return password_hash.verify(password, password_hash_value)


def _token_payload(subject: str, token_type: str, expires_delta: timedelta, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "exp": utc_now() + expires_delta,
        "iat": utc_now(),
    }
    if extra:
        payload.update(extra)
    return payload


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    return jwt.encode(
        _token_payload(user_id, "access", timedelta(minutes=settings.access_token_expire_minutes)),
        settings.secret_key,
        algorithm="HS256",
    )


def create_refresh_token(user_id: str, session_id: str) -> str:
    settings = get_settings()
    return jwt.encode(
        _token_payload(user_id, "refresh", timedelta(days=settings.refresh_token_expire_days), {"sid": session_id}),
        settings.secret_key,
        algorithm="HS256",
    )


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _fernet() -> Fernet:
    settings = get_settings()
    key = hashlib.sha256(settings.secret_key.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_value(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_value(value: str) -> str:
    return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")
