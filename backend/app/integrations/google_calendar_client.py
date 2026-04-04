from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from app.core.config import get_settings
from app.core.security import decrypt_value
from app.models.planner_item import PlannerItem


WEEKDAY_MAP = {
    0: "MO",
    1: "TU",
    2: "WE",
    3: "TH",
    4: "FR",
    5: "SA",
    6: "SU",
}


class GoogleCalendarClient:
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    token_url = "https://oauth2.googleapis.com/token"
    userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    calendar_api = "https://www.googleapis.com/calendar/v3"

    def __init__(self) -> None:
        self.settings = get_settings()

    def build_connect_url(self, state: str) -> str:
        params = {
            "client_id": self.settings.google_client_id,
            "redirect_uri": self.settings.google_redirect_uri,
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent",
            "scope": " ".join(self.settings.google_scopes),
            "state": state,
        }
        return f"{self.auth_url}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                self.token_url,
                data={
                    "code": code,
                    "client_id": self.settings.google_client_id,
                    "client_secret": self.settings.google_client_secret,
                    "redirect_uri": self.settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            response.raise_for_status()
            return response.json()

    async def refresh_access_token(self, encrypted_refresh_token: str) -> str:
        refresh_token = decrypt_value(encrypted_refresh_token)
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                self.token_url,
                data={
                    "client_id": self.settings.google_client_id,
                    "client_secret": self.settings.google_client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            return response.json()["access_token"]

    async def fetch_user_email(self, access_token: str) -> str | None:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(self.userinfo_url, headers={"Authorization": f"Bearer {access_token}"})
            response.raise_for_status()
            return response.json().get("email")

    async def upsert_event(self, access_token: str, calendar_id: str, external_object_id: str | None, event: dict) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            headers = {"Authorization": f"Bearer {access_token}"}
            if external_object_id:
                response = await client.put(
                    f"{self.calendar_api}/calendars/{calendar_id}/events/{external_object_id}",
                    headers=headers,
                    json=event,
                )
            else:
                response = await client.post(
                    f"{self.calendar_api}/calendars/{calendar_id}/events",
                    headers=headers,
                    json=event,
                )
            response.raise_for_status()
            return response.json()

    async def delete_event(self, access_token: str, calendar_id: str, external_object_id: str) -> None:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.delete(
                f"{self.calendar_api}/calendars/{calendar_id}/events/{external_object_id}",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()


def google_event_payload(title: str, description: str | None, start_at: datetime, end_at: datetime | None, all_day: bool) -> dict:
    if all_day:
        end_date = (end_at or (start_at + timedelta(days=1))).date()
        return {
            "summary": title,
            "description": description or "",
            "start": {"date": start_at.date().isoformat()},
            "end": {"date": end_date.isoformat()},
        }
    return {
        "summary": title,
        "description": description or "",
        "start": {"dateTime": start_at.astimezone(timezone.utc).isoformat()},
        "end": {"dateTime": (end_at or start_at).astimezone(timezone.utc).isoformat()},
    }


def _event_timezone(item: PlannerItem) -> str:
    timezone_name = item.recurrence_rule.timezone if item.recurrence_rule else "UTC"
    try:
        ZoneInfo(timezone_name)
        return timezone_name
    except ZoneInfoNotFoundError:
        return "UTC"


def _build_google_recurrence(item: PlannerItem) -> list[str] | None:
    rule = item.recurrence_rule
    if not item.is_recurring or rule is None:
        return None

    parts = [f"FREQ={rule.frequency.upper()}", f"INTERVAL={max(rule.interval, 1)}"]

    if rule.frequency == "weekly":
        weekdays = rule.by_weekdays or [item.start_at.weekday() if item.start_at else 0]
        byday = ",".join(WEEKDAY_MAP[weekday] for weekday in weekdays if weekday in WEEKDAY_MAP)
        if byday:
            parts.append(f"BYDAY={byday}")

    if rule.frequency == "monthly" and rule.day_of_month:
        parts.append(f"BYMONTHDAY={rule.day_of_month}")

    if rule.occurrence_count:
        parts.append(f"COUNT={rule.occurrence_count}")
    elif rule.ends_on:
        if item.all_day:
            parts.append(f"UNTIL={rule.ends_on.strftime('%Y%m%d')}")
        else:
            series_tz = ZoneInfo(_event_timezone(item))
            local_until = datetime.combine(rule.ends_on, datetime.max.time().replace(microsecond=0), tzinfo=series_tz)
            parts.append(f"UNTIL={local_until.astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}")

    return [f"RRULE:{';'.join(parts)}"]


def google_event_payload_for_item(item: PlannerItem) -> dict:
    if item.start_at is None:
        raise ValueError("Event must have start_at")

    payload = {
        "summary": item.title,
        "description": item.description or "",
    }

    if item.all_day:
        end_date = (item.end_at or (item.start_at + timedelta(days=1))).date()
        payload["start"] = {"date": item.start_at.date().isoformat()}
        payload["end"] = {"date": end_date.isoformat()}
    else:
        event_timezone = _event_timezone(item)
        tz = ZoneInfo(event_timezone)
        local_start = item.start_at.astimezone(tz)
        local_end = (item.end_at or item.start_at).astimezone(tz)
        payload["start"] = {"dateTime": local_start.isoformat(), "timeZone": event_timezone}
        payload["end"] = {"dateTime": local_end.isoformat(), "timeZone": event_timezone}

    recurrence = _build_google_recurrence(item)
    if recurrence:
        payload["recurrence"] = recurrence

    return payload
