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

