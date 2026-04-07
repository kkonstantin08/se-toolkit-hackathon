from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.item import CompletionRequest, DeleteOccurrenceRequest, ItemCreate, ItemResponse, ItemUpdate
from app.services import google_sync as google_service
from app.services import planner as planner_service

router = APIRouter()


@router.get("", response_model=list[ItemResponse])
def list_items(
    start: datetime | None = None,
    end: datetime | None = None,
    item_type: str | None = Query(default=None, pattern="^(task|event)$"),
    status_value: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return planner_service.list_items(db, current_user, start, end, item_type, status_value)


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(payload: ItemCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = planner_service.create_item(db, current_user, payload)
    await google_service.auto_sync_item_change(db, current_user, item)
    return planner_service.get_item_or_404(db, current_user.id, item.id)


@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return planner_service.get_item_or_404(db, current_user.id, item_id)


@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(item_id: str, payload: ItemUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = planner_service.get_item_or_404(db, current_user.id, item_id)
    updated_item = planner_service.update_item(db, item, payload)
    await google_service.auto_sync_item_change(db, current_user, updated_item)
    return planner_service.get_item_or_404(db, current_user.id, updated_item.id)


@router.delete("/{item_id}", response_model=MessageResponse)
async def delete_item(item_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = planner_service.get_item_or_404(db, current_user.id, item_id)
    planner_service.delete_item(db, item)
    await google_service.auto_sync_item_change(db, current_user, item)
    return MessageResponse(message="Item deleted")


@router.post("/{item_id}/delete-occurrence", response_model=ItemResponse)
def delete_item_occurrence(
    item_id: str,
    payload: DeleteOccurrenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = planner_service.get_item_or_404(db, current_user.id, item_id)
    return planner_service.delete_occurrence(db, item, payload.occurrence_date)


@router.post("/{item_id}/complete", response_model=ItemResponse)
def complete_item(item_id: str, payload: CompletionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = planner_service.get_item_or_404(db, current_user.id, item_id)
    return planner_service.complete_item(db, item, payload)


@router.post("/{item_id}/uncomplete", response_model=ItemResponse)
def uncomplete_item(item_id: str, payload: CompletionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = planner_service.get_item_or_404(db, current_user.id, item_id)
    return planner_service.uncomplete_item(db, item, payload)
