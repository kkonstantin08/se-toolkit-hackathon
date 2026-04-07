def test_weekly_recurrence_visible_in_week_view(auth_client):
    created = auth_client.post(
        "/api/v1/items",
        json={
            "item_type": "event",
            "title": "Algorithms seminar",
            "start_at": "2026-04-06T09:00:00Z",
            "end_at": "2026-04-06T10:30:00Z",
            "reminders": [],
            "recurrence": {
                "frequency": "weekly",
                "interval": 1,
                "by_weekdays": [0, 2],
                "timezone": "UTC",
            },
        },
    )
    assert created.status_code == 201

    week = auth_client.get("/api/v1/planner/week?start=2026-04-06")
    assert week.status_code == 200
    titles = [item["title"] for item in week.json()["items"]]
    assert "Algorithms seminar" in titles


def test_delete_single_recurring_occurrence_hides_only_selected_occurrence(auth_client):
    created = auth_client.post(
        "/api/v1/items",
        json={
            "item_type": "event",
            "title": "Algorithms seminar",
            "start_at": "2026-04-06T09:00:00Z",
            "end_at": "2026-04-06T10:30:00Z",
            "reminders": [],
            "recurrence": {
                "frequency": "weekly",
                "interval": 1,
                "by_weekdays": [0, 2],
                "timezone": "UTC",
            },
        },
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    before_delete = auth_client.get("/api/v1/planner/week?start=2026-04-06")
    assert before_delete.status_code == 200
    before_dates = sorted(item["occurrence_date"] for item in before_delete.json()["items"])
    assert before_dates == ["2026-04-06", "2026-04-08"]

    delete_occurrence = auth_client.post(
        f"/api/v1/items/{item_id}/delete-occurrence",
        json={"occurrence_date": "2026-04-08"},
    )
    assert delete_occurrence.status_code == 200

    after_delete = auth_client.get("/api/v1/planner/week?start=2026-04-06")
    assert after_delete.status_code == 200
    after_dates = sorted(item["occurrence_date"] for item in after_delete.json()["items"])
    assert after_dates == ["2026-04-06"]

    next_week = auth_client.get("/api/v1/planner/week?start=2026-04-13")
    assert next_week.status_code == 200
    next_week_dates = sorted(item["occurrence_date"] for item in next_week.json()["items"])
    assert next_week_dates == ["2026-04-13", "2026-04-15"]


def test_delete_recurring_series_hides_all_occurrences(auth_client):
    created = auth_client.post(
        "/api/v1/items",
        json={
            "item_type": "event",
            "title": "Physics lab",
            "start_at": "2026-04-06T13:00:00Z",
            "end_at": "2026-04-06T14:00:00Z",
            "reminders": [],
            "recurrence": {
                "frequency": "weekly",
                "interval": 1,
                "by_weekdays": [0, 2],
                "timezone": "UTC",
            },
        },
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    delete_response = auth_client.delete(f"/api/v1/items/{item_id}")
    assert delete_response.status_code == 200

    week = auth_client.get("/api/v1/planner/week?start=2026-04-06")
    assert week.status_code == 200
    titles = [item["title"] for item in week.json()["items"]]
    assert "Physics lab" not in titles

