from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.security import utc_now
from app.models.occurrence_state import OccurrenceState
from app.models.planner_item import PlannerItem
from app.models.recurrence_rule import RecurrenceRule
from app.models.reminder import Reminder
from app.models.user import User
from app.schemas.common import RecurrencePayload, ReminderPayload
from app.schemas.item import CompletionRequest, ItemCreate, ItemOccurrenceResponse, ItemResponse, ItemUpdate
from app.schemas.planner import PlannerWeekResponse
from app.utils.datetime import ensure_utc
from app.utils.recurrence import expand_item_in_range, occurs_on_date


def _base_item_query(user_id: str):
    return (
        select(PlannerItem)
        .where(PlannerItem.user_id == user_id, PlannerItem.deleted_at.is_(None))
        .options(
            selectinload(PlannerItem.reminders),
            selectinload(PlannerItem.recurrence_rule),
            selectinload(PlannerItem.occurrence_states),
            selectinload(PlannerItem.sync_states),
        )
    )


def _default_status(item_type: str) -> str:
    return "scheduled" if item_type == "event" else "pending"


def _upsert_recurrence(item: PlannerItem, recurrence: RecurrencePayload | None) -> None:
    if recurrence is None:
        item.is_recurring = False
        item.recurrence_rule = None
        item.recurrence_rule_id = None
        return
    item.is_recurring = True
    if item.recurrence_rule is None:
        item.recurrence_rule = RecurrenceRule()
    item.recurrence_rule.frequency = recurrence.frequency
    item.recurrence_rule.interval = recurrence.interval
    item.recurrence_rule.by_weekdays = recurrence.by_weekdays
    item.recurrence_rule.day_of_month = recurrence.day_of_month
    item.recurrence_rule.ends_on = recurrence.ends_on
    item.recurrence_rule.occurrence_count = recurrence.occurrence_count
    item.recurrence_rule.timezone = recurrence.timezone


def _replace_reminders(item: PlannerItem, reminders: list[ReminderPayload]) -> None:
    item.reminders.clear()
    for reminder in reminders:
        item.reminders.append(
            Reminder(
                trigger_mode=reminder.trigger_mode,
                offset_minutes=reminder.offset_minutes,
                absolute_trigger_at=ensure_utc(reminder.absolute_trigger_at),
                channel=reminder.channel,
                is_enabled=reminder.is_enabled,
            )
        )


def _serialize_item(item: PlannerItem) -> ItemResponse:
    recurrence = item.recurrence_rule
    return ItemResponse(
        id=item.id,
        user_id=item.user_id,
        item_type=item.item_type,
        title=item.title,
        description=item.description,
        start_at=item.start_at,
        end_at=item.end_at,
        due_at=item.due_at,
        all_day=item.all_day,
        status=item.status,
        source=item.source,
        color=item.color,
        is_recurring=item.is_recurring,
        created_at=item.created_at,
        updated_at=item.updated_at,
        reminders=[ReminderPayload.model_validate(reminder) for reminder in item.reminders],
        recurrence=RecurrencePayload.model_validate(recurrence) if recurrence else None,
    )


def _occurrence_completed(item: PlannerItem, occurrence_date: date | None) -> bool:
    if occurrence_date is None:
        return item.status == "completed"
    return any(
        state.occurrence_date == occurrence_date and state.completion_status == "completed" and not state.is_skipped
        for state in item.occurrence_states
    )


def _occurrence_hidden(item: PlannerItem, occurrence_date: date | None) -> bool:
    if occurrence_date is None:
        return False
    return any(state.occurrence_date == occurrence_date and state.is_skipped for state in item.occurrence_states)


def _serialize_occurrence(item: PlannerItem, occurrence) -> ItemOccurrenceResponse:
    sync_status = item.sync_states[0].sync_status if item.sync_states else None
    base = _serialize_item(item)
    return ItemOccurrenceResponse(
        **base.model_dump(),
        occurrence_date=occurrence.occurrence_date,
        display_start_at=occurrence.display_start_at,
        display_end_at=occurrence.display_end_at,
        display_due_at=occurrence.display_due_at,
        completed_for_occurrence=_occurrence_completed(item, occurrence.occurrence_date),
        sync_status=sync_status,
    )


def create_item(db: Session, user: User, payload: ItemCreate) -> PlannerItem:
    item = PlannerItem(
        user_id=user.id,
        item_type=payload.item_type,
        title=payload.title.strip(),
        description=payload.description,
        start_at=ensure_utc(payload.start_at),
        end_at=ensure_utc(payload.end_at),
        due_at=ensure_utc(payload.due_at),
        all_day=payload.all_day,
        status=payload.status or _default_status(payload.item_type),
        source=payload.source,
        color=payload.color,
    )
    _upsert_recurrence(item, payload.recurrence)
    _replace_reminders(item, payload.reminders)
    db.add(item)
    db.commit()
    db.refresh(item)
    return db.scalar(_base_item_query(user.id).where(PlannerItem.id == item.id))


def get_item_or_404(db: Session, user_id: str, item_id: str) -> PlannerItem:
    item = db.scalar(_base_item_query(user_id).where(PlannerItem.id == item_id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


def list_items(db: Session, user: User, range_start: datetime | None, range_end: datetime | None, item_type: str | None, status_value: str | None) -> list[ItemResponse]:
    query = _base_item_query(user.id)
    if item_type:
        query = query.where(PlannerItem.item_type == item_type)
    if status_value:
        query = query.where(PlannerItem.status == status_value)
    if range_start and range_end:
        range_start = ensure_utc(range_start)
        range_end = ensure_utc(range_end)
        query = query.where(
            or_(
                and_(PlannerItem.start_at.is_not(None), PlannerItem.start_at <= range_end, or_(PlannerItem.end_at.is_(None), PlannerItem.end_at >= range_start)),
                and_(PlannerItem.due_at.is_not(None), PlannerItem.due_at >= range_start, PlannerItem.due_at <= range_end),
                PlannerItem.is_recurring.is_(True),
            )
        )
    items = db.scalars(query.order_by(PlannerItem.created_at.desc())).all()
    return [_serialize_item(item) for item in items]


def update_item(db: Session, item: PlannerItem, payload: ItemUpdate) -> PlannerItem:
    data = payload.model_dump(exclude_unset=True)
    reminders = data.pop("reminders", None)
    recurrence_marker = "recurrence" in data
    recurrence = data.pop("recurrence", None)

    for field, value in data.items():
        if field in {"start_at", "end_at", "due_at"}:
            value = ensure_utc(value)
        setattr(item, field, value)

    if reminders is not None:
        _replace_reminders(item, [ReminderPayload.model_validate(reminder) for reminder in reminders])
    if recurrence_marker:
        recurrence_payload = RecurrencePayload.model_validate(recurrence) if recurrence else None
        _upsert_recurrence(item, recurrence_payload)

    item.updated_at = utc_now()
    db.commit()
    db.refresh(item)
    return get_item_or_404(db, item.user_id, item.id)


def delete_item(db: Session, item: PlannerItem) -> None:
    item.deleted_at = utc_now()
    item.updated_at = utc_now()
    db.commit()


def get_week_view(db: Session, user: User, start: date) -> PlannerWeekResponse:
    start_dt = datetime.combine(start, time.min, tzinfo=timezone.utc)
    end_dt = start_dt + timedelta(days=7) - timedelta(seconds=1)
    items = db.scalars(_base_item_query(user.id)).all()
    occurrences: list[ItemOccurrenceResponse] = []
    for item in items:
        for occurrence in expand_item_in_range(item, start_dt, end_dt):
            if _occurrence_hidden(item, occurrence.occurrence_date):
                continue
            occurrences.append(_serialize_occurrence(item, occurrence))
    occurrences.sort(key=lambda item: item.display_start_at or item.display_due_at or item.created_at)
    return PlannerWeekResponse(start_of_week=start_dt.date(), end_of_week=end_dt.date(), items=occurrences)


def delete_occurrence(db: Session, item: PlannerItem, occurrence_date: date) -> PlannerItem:
    if item.item_type != "event":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only events support occurrence deletion")
    if not item.is_recurring or item.recurrence_rule is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only recurring events support occurrence deletion")

    anchor_dt = item.start_at or item.due_at
    if anchor_dt is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recurring event must have a base date")

    if not occurs_on_date(item.recurrence_rule, anchor_dt.date(), occurrence_date):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Occurrence does not exist for this recurring event")

    state = db.scalar(
        select(OccurrenceState).where(
            OccurrenceState.planner_item_id == item.id,
            OccurrenceState.occurrence_date == occurrence_date,
        )
    )
    if state is None:
        state = OccurrenceState(planner_item_id=item.id, occurrence_date=occurrence_date)
        db.add(state)

    state.completion_status = "skipped"
    state.completed_at = None
    state.is_skipped = True
    item.updated_at = utc_now()
    db.commit()
    return get_item_or_404(db, item.user_id, item.id)


def complete_item(db: Session, item: PlannerItem, payload: CompletionRequest) -> PlannerItem:
    if item.item_type != "task":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only tasks can be completed")
    if item.is_recurring:
        occurrence_date = payload.occurrence_date or utc_now().date()
        state = db.scalar(
            select(OccurrenceState).where(
                OccurrenceState.planner_item_id == item.id,
                OccurrenceState.occurrence_date == occurrence_date,
            )
        )
        if state is None:
            state = OccurrenceState(planner_item_id=item.id, occurrence_date=occurrence_date)
            db.add(state)
        state.completion_status = "completed"
        state.completed_at = utc_now()
        state.is_skipped = False
    else:
        item.status = "completed"
    db.commit()
    return get_item_or_404(db, item.user_id, item.id)


def uncomplete_item(db: Session, item: PlannerItem, payload: CompletionRequest) -> PlannerItem:
    if item.item_type != "task":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only tasks can be uncompleted")
    if item.is_recurring:
        occurrence_date = payload.occurrence_date or utc_now().date()
        state = db.scalar(
            select(OccurrenceState).where(
                OccurrenceState.planner_item_id == item.id,
                OccurrenceState.occurrence_date == occurrence_date,
            )
        )
        if state is not None:
            db.delete(state)
    else:
        item.status = "pending"
    db.commit()
    return get_item_or_404(db, item.user_id, item.id)

