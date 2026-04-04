from __future__ import annotations

from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.security import utc_now
from app.models.user import User
from app.services.planner import get_week_view


def list_due_reminders(db: Session, user: User) -> list[dict]:
    now = utc_now()
    lower_bound = now - timedelta(minutes=5)
    week = get_week_view(db, user, now.date() - timedelta(days=now.weekday()))
    due: list[dict] = []
    for occurrence in week.items:
        base_dt = occurrence.display_start_at or occurrence.display_due_at
        if base_dt is None:
            continue
        for reminder in occurrence.reminders:
            if not reminder.is_enabled:
                continue
            if reminder.trigger_mode == "absolute":
                trigger_at = reminder.absolute_trigger_at
            else:
                trigger_at = base_dt + timedelta(minutes=reminder.offset_minutes or 0)
            if trigger_at and lower_bound <= trigger_at <= now:
                due.append(
                    {
                        "item_id": occurrence.id,
                        "title": occurrence.title,
                        "item_type": occurrence.item_type,
                        "trigger_at": trigger_at,
                        "channel": reminder.channel,
                        "occurrence_date": occurrence.occurrence_date,
                    }
                )
    return due

