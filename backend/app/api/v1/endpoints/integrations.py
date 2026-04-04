from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.integration import ConnectUrlResponse, GoogleStatusResponse, SyncResponse
from app.services import google_sync as google_service
from app.services.planner import get_item_or_404

router = APIRouter()


@router.get("/google/status", response_model=GoogleStatusResponse)
def google_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    settings = google_service.get_settings()
    configured = bool(settings.google_client_id and settings.google_client_secret and settings.google_redirect_uri)
    integration = google_service.get_active_integration(db, current_user.id)
    if integration is None:
        return GoogleStatusResponse(configured=configured, connected=False)
    return GoogleStatusResponse(
        configured=configured,
        connected=True,
        provider_email=integration.provider_email,
        default_calendar_id=integration.default_calendar_id,
        connected_at=integration.connected_at,
    )


@router.get("/google/connect-url", response_model=ConnectUrlResponse)
def google_connect_url(current_user: User = Depends(get_current_user)):
    return ConnectUrlResponse(url=google_service.build_connect_url(current_user))


@router.get("/google/callback")
async def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    redirect_url = await google_service.handle_callback(db, code, state)
    return RedirectResponse(redirect_url)


@router.delete("/google")
def disconnect_google(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    google_service.disconnect_google(db, current_user)
    return {"message": "Google Calendar disconnected"}


@router.post("/google/sync/items/{item_id}", response_model=SyncResponse)
async def sync_item(item_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = get_item_or_404(db, current_user.id, item_id)
    sync_state = await google_service.sync_item_to_google(db, current_user, item)
    return SyncResponse.model_validate(sync_state)
