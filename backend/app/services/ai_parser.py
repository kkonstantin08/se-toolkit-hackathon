from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
import json
import logging
import re
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import utc_now
from app.integrations.mistral_client import MistralClient
from app.models.parsed_draft import ParsedDraft
from app.models.user import User
from app.schemas.ai import ConfirmDraftRequest, ParseRequest
from app.schemas.item import ItemCreate
from app.services.planner import create_item

logger = logging.getLogger(__name__)


def _get_timezone_info(timezone_name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(timezone_name or "UTC")
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _resolve_timezone_name(user: User, client_timezone: str | None = None) -> str:
    return client_timezone or user.timezone or "UTC"


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    parsed = datetime.fromisoformat(cleaned)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _to_utc_iso(local_dt: datetime) -> str:
    return local_dt.astimezone(timezone.utc).isoformat()


def _combine_local(date_value: date, hour: int, minute: int, tz: ZoneInfo) -> datetime:
    return datetime.combine(date_value, time(hour=hour, minute=minute), tzinfo=tz)


def _extract_explicit_time(raw_text: str) -> tuple[int, int] | None:
    lowered = raw_text.lower()

    meridiem_match = re.search(r"\b(?:в\s*)?(\d{1,2})(?::(\d{2}))?\s*(утра|утром|вечера|вечером|дня|ноч[ьи]|am|pm)\b", lowered)
    if meridiem_match:
        hour = int(meridiem_match.group(1))
        minute = int(meridiem_match.group(2) or 0)
        marker = meridiem_match.group(3)
        if marker in {"вечера", "вечером", "pm", "дня"} and hour < 12:
            hour += 12
        if marker in {"утра", "утром", "am"} and hour == 12:
            hour = 0
        if marker.startswith("ноч") and hour == 12:
            hour = 0
        return hour, minute

    exact_match = re.search(r"\b(?:в\s*)?([01]?\d|2[0-3]):([0-5]\d)\b", lowered)
    if exact_match:
        return int(exact_match.group(1)), int(exact_match.group(2))

    plain_hour_match = re.search(r"\b(?:в\s*)?([01]?\d|2[0-3])\s*час", lowered)
    if plain_hour_match:
        return int(plain_hour_match.group(1)), 0

    return None


def _extract_target_date(raw_text: str, now_local: datetime) -> tuple[date | None, str | None]:
    lowered = raw_text.lower()

    if "послезавтра" in lowered:
        return now_local.date() + timedelta(days=2), "relative"
    if "завтра" in lowered or "tomorrow" in lowered:
        return now_local.date() + timedelta(days=1), "relative"
    if "сегодня" in lowered or "today" in lowered or "tonight" in lowered:
        return now_local.date(), "relative"

    iso_date_match = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", lowered)
    if iso_date_match:
        return date(int(iso_date_match.group(1)), int(iso_date_match.group(2)), int(iso_date_match.group(3))), "explicit"

    dotted_match = re.search(r"\b(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?\b", lowered)
    if dotted_match:
        day = int(dotted_match.group(1))
        month = int(dotted_match.group(2))
        year = int(dotted_match.group(3)) if dotted_match.group(3) else now_local.year
        return date(year, month, day), "explicit"

    return None, None


def _build_mistral_prompt(raw_text: str, timezone_name: str) -> str:
    user_tz = _get_timezone_info(timezone_name)
    now_local = utc_now().astimezone(user_tz)
    return (
        "Extract exactly one planner item and return JSON only.\n"
        f"User timezone: {timezone_name}\n"
        f"Current local datetime: {now_local.isoformat()}\n"
        f"Current local date: {now_local.date().isoformat()}\n"
        "Rules:\n"
        "- Resolve words like today/сегодня, tomorrow/завтра, послезавтра relative to the current local date above.\n"
        "- If the user specifies a date without a time, default the time to 09:00 in the user's local timezone.\n"
        "- If the user specifies a time like '9 вечера', interpret it as 21:00 in the user's local timezone.\n"
        "- Return ISO datetimes in UTC.\n"
        "- Never invent old years for relative dates.\n"
        "Required keys: item_type,title,description,start_at,end_at,due_at,all_day,status,source,color,reminders,recurrence,warnings.\n"
        f"User text: {raw_text}"
    )


def _extract_json_candidate(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if not isinstance(value, str):
        raise ValueError("AI response is not a JSON object")

    text = value.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Could not find JSON object in AI response")
    return json.loads(text[start : end + 1])


def _normalize_datetime(value: Any) -> str | None:
    if value in (None, "", "null"):
        return None
    if isinstance(value, dict):
        return (
            value.get("dateTime")
            or value.get("datetime")
            or value.get("iso")
            or value.get("date")
        )
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return None
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", cleaned):
            return f"{cleaned}T09:00:00+00:00"
        if cleaned.endswith("Z") or "+" in cleaned[10:]:
            return cleaned
        if "T" in cleaned:
            return f"{cleaned}+00:00"
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}", cleaned):
            return cleaned.replace(" ", "T") + ":00+00:00"
    return None


def _apply_time_context(
    raw_text: str,
    item_type: str,
    start_at: str | None,
    end_at: str | None,
    due_at: str | None,
    timezone_name: str,
) -> tuple[str | None, str | None, str | None, list[str]]:
    warnings: list[str] = []
    user_tz = _get_timezone_info(timezone_name)
    now_local = utc_now().astimezone(user_tz)
    target_date, date_source = _extract_target_date(raw_text, now_local)
    explicit_time = _extract_explicit_time(raw_text)

    primary_value = start_at if item_type == "event" else due_at or start_at
    primary_dt = _parse_iso_datetime(primary_value)
    local_primary_dt = primary_dt.astimezone(user_tz) if primary_dt else None

    duration: timedelta | None = None
    if item_type == "event" and start_at and end_at:
        start_dt = _parse_iso_datetime(start_at)
        end_dt = _parse_iso_datetime(end_at)
        if start_dt and end_dt and end_dt > start_dt:
            duration = end_dt - start_dt

    if target_date is None and not explicit_time:
        return start_at, end_at, due_at, warnings

    if target_date is None and local_primary_dt is not None:
        target_date = local_primary_dt.date()

    if target_date is None:
        target_date = now_local.date()

    if explicit_time is not None:
        hour, minute = explicit_time
    elif target_date is not None:
        hour, minute = 9, 0
        warnings.append("No explicit time provided, defaulted to 09:00 local time.")
    elif local_primary_dt is not None:
        hour, minute = local_primary_dt.hour, local_primary_dt.minute
    else:
        hour, minute = 9, 0
        warnings.append("No explicit time provided, defaulted to 09:00 local time.")

    adjusted_local = _combine_local(target_date, hour, minute, user_tz)
    adjusted_primary = _to_utc_iso(adjusted_local)

    if date_source == "relative":
        warnings.append(f"Relative date was resolved against the user's local date {now_local.date().isoformat()}.")

    if item_type == "event":
        start_at = adjusted_primary
        if duration is not None:
            end_at = (adjusted_local.astimezone(timezone.utc) + duration).isoformat()
        elif end_at is not None:
            adjusted_end_local = adjusted_local + timedelta(hours=1)
            end_at = adjusted_end_local.astimezone(timezone.utc).isoformat()
    else:
        if due_at is not None or start_at is None:
            due_at = adjusted_primary
        else:
            start_at = adjusted_primary

    return start_at, end_at, due_at, warnings


def _extract_relative_reminders(raw_text: str) -> list[dict[str, Any]]:
    patterns = [
        (r"за\s+(\d+)\s+дн", 24 * 60),
        (r"за\s+(\d+)\s+час", 60),
        (r"за\s+(\d+)\s+мин", 1),
        (r"in\s+(\d+)\s+day", 24 * 60),
        (r"in\s+(\d+)\s+hour", 60),
        (r"in\s+(\d+)\s+minute", 1),
    ]
    reminders: list[dict[str, Any]] = []
    lowered = raw_text.lower()
    seen_offsets: set[int] = set()
    for pattern, multiplier in patterns:
        for match in re.finditer(pattern, lowered):
            offset = -int(match.group(1)) * multiplier
            if offset in seen_offsets:
                continue
            seen_offsets.add(offset)
            reminders.append(
                {
                    "trigger_mode": "relative",
                    "offset_minutes": offset,
                    "absolute_trigger_at": None,
                    "channel": "in_app",
                    "is_enabled": True,
                }
            )
    return reminders


def _normalize_reminders(reminders: Any, raw_text: str) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    if isinstance(reminders, list):
        for reminder in reminders:
            if not isinstance(reminder, dict):
                continue
            absolute_trigger = _normalize_datetime(
                reminder.get("absolute_trigger_at")
                or reminder.get("absolute_time")
                or reminder.get("at")
                or reminder.get("datetime")
            )
            minutes = (
                reminder.get("offset_minutes")
                or reminder.get("minutes_before")
                or reminder.get("minutes")
                or reminder.get("offset")
            )
            trigger_mode = "absolute" if absolute_trigger else "relative"
            offset_minutes = None
            if minutes not in (None, ""):
                offset_minutes = int(minutes)
                if trigger_mode == "relative" and offset_minutes > 0:
                    offset_minutes = -offset_minutes

            normalized.append(
                {
                    "trigger_mode": trigger_mode,
                    "offset_minutes": offset_minutes if trigger_mode == "relative" else None,
                    "absolute_trigger_at": absolute_trigger if trigger_mode == "absolute" else None,
                    "channel": "browser" if reminder.get("method") == "browser" else "in_app",
                    "is_enabled": True,
                }
            )

    if not normalized:
        normalized = _extract_relative_reminders(raw_text)

    return normalized


def _normalize_recurrence(recurrence: Any) -> dict[str, Any] | None:
    if not isinstance(recurrence, dict):
        return None

    frequency = recurrence.get("frequency") or recurrence.get("repeat") or recurrence.get("type")
    if frequency not in {"daily", "weekly", "monthly"}:
        return None

    return {
        "frequency": frequency,
        "interval": int(recurrence.get("interval") or 1),
        "by_weekdays": recurrence.get("by_weekdays") or recurrence.get("weekdays"),
        "day_of_month": recurrence.get("day_of_month"),
        "ends_on": recurrence.get("ends_on") or recurrence.get("end_date"),
        "occurrence_count": recurrence.get("occurrence_count") or recurrence.get("count"),
        "timezone": recurrence.get("timezone") or "UTC",
    }


def _normalize_item_payload(raw_payload: dict[str, Any], raw_text: str, timezone_name: str) -> tuple[dict[str, Any], list[str]]:
    warnings: list[str] = []
    payload = raw_payload.get("item") if isinstance(raw_payload.get("item"), dict) else raw_payload

    item_type = payload.get("item_type") or payload.get("type")
    if item_type not in {"task", "event"}:
        lowered = raw_text.lower()
        item_type = "event" if any(token in lowered for token in ["встреч", "лекц", "meet", "event", "call"]) else "task"
        warnings.append("AI did not return a valid item_type, inferred one from the text.")

    title = (
        payload.get("title")
        or payload.get("summary")
        or payload.get("name")
        or raw_text.strip().split(".")[0][:120]
    )
    description = payload.get("description") or payload.get("details") or payload.get("notes") or raw_text.strip()

    start_at = _normalize_datetime(payload.get("start_at") or payload.get("start") or payload.get("start_datetime"))
    end_at = _normalize_datetime(payload.get("end_at") or payload.get("end") or payload.get("end_datetime"))
    due_at = _normalize_datetime(payload.get("due_at") or payload.get("due") or payload.get("deadline"))

    if item_type == "event" and start_at is None and due_at is not None:
        start_at, due_at = due_at, None
        warnings.append("AI returned due_at for an event, moved it to start_at.")

    if item_type == "task" and due_at is None and start_at is not None:
        due_at = start_at
        start_at = None
        warnings.append("AI returned start_at for a task, treated it as due_at.")

    start_at, end_at, due_at, time_warnings = _apply_time_context(raw_text, item_type, start_at, end_at, due_at, timezone_name)
    warnings.extend(time_warnings)

    reminders = _normalize_reminders(payload.get("reminders"), raw_text)
    recurrence = _normalize_recurrence(payload.get("recurrence"))

    normalized = {
        "item_type": item_type,
        "title": str(title).strip(),
        "description": description,
        "start_at": start_at,
        "end_at": end_at,
        "due_at": due_at,
        "all_day": bool(payload.get("all_day", False)),
        "status": payload.get("status") or ("scheduled" if item_type == "event" else "pending"),
        "source": "ai",
        "color": payload.get("color") or "#10B981",
        "reminders": reminders,
        "recurrence": recurrence,
    }
    return normalized, warnings


def _heuristic_parse(raw_text: str, timezone_name: str) -> tuple[dict[str, Any], list[str], str, str]:
    lower = raw_text.lower()
    item_type = "event" if any(token in lower for token in ["в ", "лекц", "встреч", "meet", "class", "call"]) else "task"
    title = raw_text.strip().split(".")[0][:120]
    description = raw_text.strip()
    warnings = ["Mistral is unavailable, heuristic fallback was used."]

    due_at = None
    start_at = None
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})(?:[ t](\d{2}:\d{2}))?", raw_text)
    if date_match:
        date_part = date_match.group(1)
        time_part = date_match.group(2)
        iso_value = f"{date_part}T{time_part or '09:00'}:00+00:00"
        if item_type == "event":
            start_at = iso_value
        else:
            due_at = iso_value

    parsed = {
        "item_type": item_type,
        "title": title,
        "description": description,
        "start_at": start_at,
        "end_at": None,
        "due_at": due_at,
        "all_day": False,
        "status": "scheduled" if item_type == "event" else "pending",
        "source": "ai",
        "color": "#10B981",
        "reminders": _extract_relative_reminders(raw_text),
        "recurrence": None,
    }
    parsed["start_at"], parsed["end_at"], parsed["due_at"], time_warnings = _apply_time_context(
        raw_text,
        item_type,
        parsed["start_at"],
        parsed["end_at"],
        parsed["due_at"],
        timezone_name,
    )
    warnings.extend(time_warnings)
    return parsed, warnings, "heuristic-fallback", "fallback"


async def create_parse_draft(db: Session, user: User, payload: ParseRequest) -> ParsedDraft:
    settings = get_settings()
    warnings: list[str] = []
    model_name = settings.mistral_model
    parse_source = "mistral"
    timezone_name = _resolve_timezone_name(user, payload.client_timezone)

    try:
        if settings.mistral_api_key:
            client = MistralClient()
            raw_response = await client.parse_planner_text(_build_mistral_prompt(payload.raw_text, timezone_name))
            parsed, normalization_warnings = _normalize_item_payload(_extract_json_candidate(raw_response), payload.raw_text, timezone_name)
            warnings = [*normalization_warnings, *raw_response.get("warnings", [])] if isinstance(raw_response, dict) else normalization_warnings
            logger.info("AI parse completed with source=mistral model=%s title=%s", model_name, parsed["title"])
        else:
            parsed, warnings, model_name, parse_source = _heuristic_parse(payload.raw_text, timezone_name)
            logger.info("AI parse completed with source=fallback title=%s", parsed["title"])
    except Exception as exc:  # noqa: BLE001
        parsed, warnings, model_name, parse_source = _heuristic_parse(payload.raw_text, timezone_name)
        warnings.append(f"AI fallback reason: {exc}")
        logger.exception("AI parse failed, switched to fallback.")

    draft = ParsedDraft(
        user_id=user.id,
        raw_text=payload.raw_text,
        parsed_payload_json={"item": parsed},
        warnings_json=warnings,
        parse_status="parsed",
        parse_source=parse_source,
        model_name=model_name,
        expires_at=utc_now() + timedelta(days=1),
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


def get_draft_or_404(db: Session, user_id: str, draft_id: str) -> ParsedDraft:
    draft = db.get(ParsedDraft, draft_id)
    if draft is None or draft.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")
    return draft


def confirm_draft(db: Session, user: User, draft: ParsedDraft, payload: ConfirmDraftRequest):
    if draft.confirmed_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft already confirmed")
    item_payload = ItemCreate.model_validate(payload.item.model_dump())
    item = create_item(db, user, item_payload)
    draft.confirmed_at = utc_now()
    draft.parse_status = "confirmed"
    db.commit()
    return item


def delete_draft(db: Session, draft: ParsedDraft) -> None:
    db.delete(draft)
    db.commit()
