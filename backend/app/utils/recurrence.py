from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from dateutil.relativedelta import relativedelta

from app.models.planner_item import PlannerItem
from app.models.recurrence_rule import RecurrenceRule


@dataclass
class OccurrenceResult:
    occurrence_date: date | None
    display_start_at: datetime | None
    display_end_at: datetime | None
    display_due_at: datetime | None


def item_anchor_datetime(item: PlannerItem) -> datetime:
    return item.start_at or item.due_at or item.created_at


def overlaps_range(item: PlannerItem, range_start: datetime, range_end: datetime) -> bool:
    if item.item_type == "event":
        start = item.start_at or item.created_at
        end = item.end_at or start
        return start <= range_end and end >= range_start
    point = item.due_at or item.start_at or item.created_at
    return range_start <= point <= range_end


def _months_between(anchor: date, candidate: date) -> int:
    return (candidate.year - anchor.year) * 12 + (candidate.month - anchor.month)


def _occurs_without_count(rule: RecurrenceRule, anchor_date: date, candidate: date) -> bool:
    if candidate < anchor_date:
        return False
    if rule.ends_on and candidate > rule.ends_on:
        return False
    interval = max(rule.interval, 1)

    if rule.frequency == "daily":
        return (candidate - anchor_date).days % interval == 0

    if rule.frequency == "weekly":
        weekdays = rule.by_weekdays or [anchor_date.weekday()]
        if candidate.weekday() not in weekdays:
            return False
        weeks = (candidate - anchor_date).days // 7
        return weeks % interval == 0

    if rule.frequency == "monthly":
        months = _months_between(anchor_date, candidate)
        if months < 0 or months % interval != 0:
            return False
        target_day = rule.day_of_month or anchor_date.day
        last_day = (candidate + relativedelta(day=31)).day
        return candidate.day == min(target_day, last_day)

    return False


def _occurrence_number(rule: RecurrenceRule, anchor_date: date, candidate: date) -> int:
    count = 0
    cursor = anchor_date
    while cursor <= candidate:
        if _occurs_without_count(rule, anchor_date, cursor):
            count += 1
        cursor += timedelta(days=1)
    return count


def occurs_on_date(rule: RecurrenceRule, anchor_date: date, candidate: date) -> bool:
    if not _occurs_without_count(rule, anchor_date, candidate):
        return False
    if rule.occurrence_count is not None:
        return _occurrence_number(rule, anchor_date, candidate) <= rule.occurrence_count
    return True


def expand_item_in_range(item: PlannerItem, range_start: datetime, range_end: datetime) -> list[OccurrenceResult]:
    if not item.is_recurring or item.recurrence_rule is None:
        if not overlaps_range(item, range_start, range_end):
            return []
        return [
            OccurrenceResult(
                occurrence_date=None,
                display_start_at=item.start_at,
                display_end_at=item.end_at,
                display_due_at=item.due_at,
            )
        ]

    anchor_dt = item_anchor_datetime(item)
    anchor_date = anchor_dt.date()
    duration = (item.end_at - item.start_at) if item.start_at and item.end_at else None
    results: list[OccurrenceResult] = []

    current = range_start.date()
    while current <= range_end.date():
        if occurs_on_date(item.recurrence_rule, anchor_date, current):
            offset = current - anchor_date
            display_start = item.start_at + offset if item.start_at else None
            display_end = display_start + duration if display_start and duration else None
            display_due = item.due_at + offset if item.due_at else None
            results.append(
                OccurrenceResult(
                    occurrence_date=current,
                    display_start_at=display_start,
                    display_end_at=display_end,
                    display_due_at=display_due,
                )
            )
        current += timedelta(days=1)
    return results

