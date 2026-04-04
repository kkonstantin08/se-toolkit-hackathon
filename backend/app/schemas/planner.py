from __future__ import annotations

from datetime import date

from pydantic import BaseModel

from app.schemas.item import ItemOccurrenceResponse


class PlannerWeekResponse(BaseModel):
    start_of_week: date
    end_of_week: date
    items: list[ItemOccurrenceResponse]

