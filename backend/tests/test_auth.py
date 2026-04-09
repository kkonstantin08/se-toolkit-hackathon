def test_register_creates_authenticated_session(client):
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
    assert register.json()["email"] == "demo@example.com"

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "demo@example.com"


def test_duplicate_registration_rejects_email_case_insensitively(client):
    first_register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "demo@example.com",
            "password": "password123",
            "full_name": "Demo User",
            "timezone": "UTC",
        },
    )
    assert first_register.status_code == 201

    second_register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "Demo@Example.com",
            "password": "password123",
            "full_name": "Duplicate User",
            "timezone": "UTC",
        },
    )
    assert second_register.status_code == 409
    assert second_register.json()["detail"] == "Email already registered"


def test_refresh_restores_session_when_access_cookie_is_missing(client):
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

    client.cookies.delete("plansync_access_token", domain="testserver.local", path="/")

    me_before_refresh = client.get("/api/v1/auth/me")
    assert me_before_refresh.status_code == 401

    refresh = client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 200
    assert refresh.json()["email"] == "demo@example.com"

    me_after_refresh = client.get("/api/v1/auth/me")
    assert me_after_refresh.status_code == 200
    assert me_after_refresh.json()["email"] == "demo@example.com"


def test_logout_revokes_session_and_clears_auth_state(client):
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

    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 200

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 401

    refresh = client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 401
