from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.reminders import list_due_reminders

router = APIRouter()


@router.get("/due")
def due_reminders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list_due_reminders(db, current_user)

