from datetime import date, datetime, timezone

from app.integrations.google_calendar_client import google_event_payload_for_item
from app.models.planner_item import PlannerItem
from app.models.recurrence_rule import RecurrenceRule
from app.services import google_sync


def test_google_status_defaults_to_disconnected(auth_client):
    response = auth_client.get("/api/v1/integrations/google/status")
    assert response.status_code == 200
    assert response.json()["connected"] is False


def test_event_create_triggers_auto_sync(monkeypatch, auth_client):
    called: list[str] = []

    async def fake_auto_sync(db, user, item):
        called.append(item.id)
        return None

    monkeypatch.setattr(google_sync, "auto_sync_item_change", fake_auto_sync)

    response = auth_client.post(
        "/api/v1/items",
        json={
            "item_type": "event",
            "title": "Demo event",
            "description": "Auto sync me",
            "start_at": "2026-04-10T18:00:00Z",
            "end_at": "2026-04-10T19:00:00Z",
            "all_day": False,
            "source": "manual",
            "color": "#10B981",
            "reminders": [],
            "recurrence": None,
        },
    )

    assert response.status_code == 201
    assert called == [response.json()["id"]]


def test_event_delete_triggers_auto_sync(monkeypatch, auth_client):
    called: list[str] = []

    async def fake_auto_sync(db, user, item):
        called.append(item.id)
        return None

    monkeypatch.setattr(google_sync, "auto_sync_item_change", fake_auto_sync)

    create_response = auth_client.post(
        "/api/v1/items",
        json={
            "item_type": "event",
            "title": "Delete me",
            "description": "Auto sync delete",
            "start_at": "2026-04-10T18:00:00Z",
            "end_at": "2026-04-10T19:00:00Z",
            "all_day": False,
            "source": "manual",
            "color": "#10B981",
            "reminders": [],
            "recurrence": None,
        },
    )
    item_id = create_response.json()["id"]
    called.clear()

    delete_response = auth_client.delete(f"/api/v1/items/{item_id}")

    assert delete_response.status_code == 200
    assert called == [item_id]


def test_delete_single_occurrence_does_not_trigger_auto_sync(monkeypatch, auth_client):
    called: list[str] = []

    async def fake_auto_sync(db, user, item):
        called.append(item.id)
        return None

    monkeypatch.setattr(google_sync, "auto_sync_item_change", fake_auto_sync)

    create_response = auth_client.post(
        "/api/v1/items",
        json={
            "item_type": "event",
            "title": "Recurring sync event",
            "description": "Only one occurrence should disappear",
            "start_at": "2026-04-06T18:00:00Z",
            "end_at": "2026-04-06T19:00:00Z",
            "all_day": False,
            "source": "manual",
            "color": "#10B981",
            "reminders": [],
            "recurrence": {
                "frequency": "weekly",
                "interval": 1,
                "by_weekdays": [0, 2],
                "timezone": "UTC",
            },
        },
    )
    item_id = create_response.json()["id"]
    called.clear()

    delete_response = auth_client.post(
        f"/api/v1/items/{item_id}/delete-occurrence",
        json={"occurrence_date": "2026-04-08"},
    )

    assert delete_response.status_code == 200
    assert called == []


def test_google_payload_includes_daily_recurrence_rule():
    item = PlannerItem(
        item_type="event",
        title="Daily standup",
        description="Recurring event",
        start_at=datetime(2026, 4, 10, 6, 0, tzinfo=timezone.utc),
        end_at=datetime(2026, 4, 10, 7, 0, tzinfo=timezone.utc),
        all_day=False,
    )
    item.is_recurring = True
    item.recurrence_rule = RecurrenceRule(
        frequency="daily",
        interval=1,
        by_weekdays=None,
        day_of_month=None,
        ends_on=date(2026, 4, 15),
        occurrence_count=None,
        timezone="Europe/Moscow",
    )

    payload = google_event_payload_for_item(item)

    assert payload["start"]["timeZone"] == "Europe/Moscow"
    assert payload["start"]["dateTime"].startswith("2026-04-10T09:00:00+03:00")
    assert payload["recurrence"] == ["RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20260415T205959Z"]


def test_google_payload_includes_weekly_byday_rule():
    item = PlannerItem(
        item_type="event",
        title="Weekly training",
        description=None,
        start_at=datetime(2026, 4, 6, 15, 0, tzinfo=timezone.utc),
        end_at=datetime(2026, 4, 6, 16, 0, tzinfo=timezone.utc),
        all_day=False,
    )
    item.is_recurring = True
    item.recurrence_rule = RecurrenceRule(
        frequency="weekly",
        interval=2,
        by_weekdays=[0, 2, 4],
        day_of_month=None,
        ends_on=None,
        occurrence_count=6,
        timezone="UTC",
    )

    payload = google_event_payload_for_item(item)

    assert payload["recurrence"] == ["RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;COUNT=6"]
