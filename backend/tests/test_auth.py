def test_register_and_me(client):
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "demo@example.com",
            "password": "password123",
            "full_name": "Demo User",
            "timezone": "UTC",
        },
    )
    assert register.status_code == 201

    login = client.post("/api/v1/auth/login", json={"email": "demo@example.com", "password": "password123"})
    assert login.status_code == 200

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "demo@example.com"

