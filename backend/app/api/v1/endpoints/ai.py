from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.ai import ConfirmDraftRequest, ParseRequest, ParsedDraftResponse
from app.schemas.common import MessageResponse
from app.schemas.item import ItemResponse
from app.services import ai_parser as ai_service
from app.services import google_sync as google_service

router = APIRouter()


@router.post("/parse", response_model=ParsedDraftResponse, status_code=status.HTTP_201_CREATED)
async def parse_text(payload: ParseRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    draft = await ai_service.create_parse_draft(db, current_user, payload)
    return ParsedDraftResponse.model_validate(draft)


@router.get("/drafts/{draft_id}", response_model=ParsedDraftResponse)
def get_draft(draft_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    draft = ai_service.get_draft_or_404(db, current_user.id, draft_id)
    return ParsedDraftResponse.model_validate(draft)


@router.post("/drafts/{draft_id}/confirm", response_model=ItemResponse)
async def confirm_draft(draft_id: str, payload: ConfirmDraftRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    draft = ai_service.get_draft_or_404(db, current_user.id, draft_id)
    item = ai_service.confirm_draft(db, current_user, draft, payload)
    await google_service.auto_sync_item_change(db, current_user, item)
    return item


@router.delete("/drafts/{draft_id}", response_model=MessageResponse)
def delete_draft(draft_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    draft = ai_service.get_draft_or_404(db, current_user.id, draft_id)
    ai_service.delete_draft(db, draft)
    return MessageResponse(message="Draft deleted")
