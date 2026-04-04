from __future__ import annotations

import logging

import jwt
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import encrypt_value, utc_now
from app.integrations.google_calendar_client import GoogleCalendarClient, google_event_payload_for_item
from app.models.integration_metadata import IntegrationMetadata
from app.models.planner_item import PlannerItem
from app.models.sync_state import SyncState
from app.models.user import User

logger = logging.getLogger(__name__)


def _require_google_config() -> None:
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret or not settings.google_redirect_uri:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google integration is not configured")


def is_google_configured() -> bool:
    settings = get_settings()
    return bool(settings.google_client_id and settings.google_client_secret and settings.google_redirect_uri)


def get_active_integration(db: Session, user_id: str) -> IntegrationMetadata | None:
    return db.scalar(
        select(IntegrationMetadata).where(
            IntegrationMetadata.user_id == user_id,
            IntegrationMetadata.provider == "google_calendar",
            IntegrationMetadata.revoked_at.is_(None),
        )
    )


def build_connect_url(user: User) -> str:
    _require_google_config()
    settings = get_settings()
    state = jwt.encode({"sub": user.id, "ts": int(utc_now().timestamp())}, settings.secret_key, algorithm="HS256")
    return GoogleCalendarClient().build_connect_url(state)


async def handle_callback(db: Session, code: str, state: str) -> str:
    _require_google_config()
    settings = get_settings()
    try:
        decoded = jwt.decode(state, settings.secret_key, algorithms=["HS256"])
        user_id = decoded["sub"]
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid state") from exc

    client = GoogleCalendarClient()
    token_data = await client.exchange_code(code)
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    provider_email = await client.fetch_user_email(access_token) if access_token else None

    integration = get_active_integration(db, user_id)
    if integration is None:
        integration = IntegrationMetadata(user_id=user_id, provider="google_calendar")
        db.add(integration)

    if refresh_token:
        integration.encrypted_refresh_token = encrypt_value(refresh_token)
    integration.provider_email = provider_email
    integration.scopes = settings.google_scopes
    integration.default_calendar_id = "primary"
    integration.connected_at = utc_now()
    integration.revoked_at = None
    db.commit()
    return f"{settings.frontend_url}/settings/integrations?google=connected"


def disconnect_google(db: Session, user: User) -> None:
    integration = get_active_integration(db, user.id)
    if integration is None:
        return
    integration.revoked_at = utc_now()
    db.commit()


def _get_sync_state(db: Session, integration_id: str, item_id: str) -> SyncState | None:
    return db.scalar(
        select(SyncState).where(
            SyncState.integration_id == integration_id,
            SyncState.planner_item_id == item_id,
        )
    )


def _ensure_sync_state(db: Session, integration_id: str, item_id: str) -> SyncState:
    sync_state = _get_sync_state(db, integration_id, item_id)
    if sync_state is None:
        sync_state = SyncState(planner_item_id=item_id, integration_id=integration_id, provider="google_calendar")
        db.add(sync_state)
    return sync_state


async def sync_item_to_google(db: Session, user: User, item: PlannerItem) -> SyncState:
    _require_google_config()
    if item.item_type != "event":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only events can be synced to Google Calendar")
    if item.start_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event must have start_at to sync")

    integration = get_active_integration(db, user.id)
    if integration is None or not integration.encrypted_refresh_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google Calendar is not connected")

    sync_state = _ensure_sync_state(db, integration.id, item.id)

    try:
        client = GoogleCalendarClient()
        access_token = await client.refresh_access_token(integration.encrypted_refresh_token)
        payload = google_event_payload_for_item(item)
        response = await client.upsert_event(
            access_token=access_token,
            calendar_id=integration.default_calendar_id or "primary",
            external_object_id=sync_state.external_object_id,
            event=payload,
        )
        sync_state.external_object_id = response.get("id")
        sync_state.sync_status = "synced"
        sync_state.last_synced_at = utc_now()
        sync_state.last_error = None
    except Exception as exc:  # noqa: BLE001
        sync_state.sync_status = "failed"
        sync_state.last_error = str(exc)
    db.commit()
    db.refresh(sync_state)
    return sync_state


async def delete_item_from_google(db: Session, user: User, item: PlannerItem) -> SyncState | None:
    _require_google_config()
    integration = get_active_integration(db, user.id)
    if integration is None or not integration.encrypted_refresh_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google Calendar is not connected")

    sync_state = _get_sync_state(db, integration.id, item.id)
    if sync_state is None:
        return None

    if not sync_state.external_object_id:
        sync_state.sync_status = "deleted"
        sync_state.last_synced_at = utc_now()
        sync_state.last_error = None
        db.commit()
        db.refresh(sync_state)
        return sync_state

    try:
        client = GoogleCalendarClient()
        access_token = await client.refresh_access_token(integration.encrypted_refresh_token)
        await client.delete_event(
            access_token=access_token,
            calendar_id=integration.default_calendar_id or "primary",
            external_object_id=sync_state.external_object_id,
        )
        sync_state.sync_status = "deleted"
        sync_state.last_synced_at = utc_now()
        sync_state.last_error = None
    except Exception as exc:  # noqa: BLE001
        sync_state.sync_status = "failed"
        sync_state.last_error = str(exc)
    db.commit()
    db.refresh(sync_state)
    return sync_state


async def auto_sync_item_change(db: Session, user: User, item: PlannerItem) -> SyncState | None:
    if not is_google_configured():
        return None

    integration = get_active_integration(db, user.id)
    if integration is None or not integration.encrypted_refresh_token:
        return None

    try:
        if item.deleted_at is not None or item.item_type != "event":
            return await delete_item_from_google(db, user, item)
        if item.start_at is None:
            return None
        return await sync_item_to_google(db, user, item)
    except HTTPException:
        return None
    except Exception:  # noqa: BLE001
        logger.exception("Automatic Google Calendar sync failed for item_id=%s", item.id)
        return None
