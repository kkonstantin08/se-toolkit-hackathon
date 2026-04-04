from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.planner import PlannerWeekResponse
from app.services.planner import get_week_view

router = APIRouter()


@router.get("/week", response_model=PlannerWeekResponse)
def weekly_planner(start: date, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_week_view(db, current_user, start)

