def test_create_and_update_task(auth_client):
    created = auth_client.post(
        "/api/v1/items",
        json={
            "item_type": "task",
            "title": "Finish lab",
            "description": "Write the final report",
            "due_at": "2026-04-06T12:00:00Z",
            "reminders": [{"trigger_mode": "relative", "offset_minutes": -30, "channel": "in_app"}],
        },
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    updated = auth_client.patch(f"/api/v1/items/{item_id}", json={"title": "Finish lab report"})
    assert updated.status_code == 200
    assert updated.json()["title"] == "Finish lab report"

    completed = auth_client.post(f"/api/v1/items/{item_id}/complete", json={})
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"

