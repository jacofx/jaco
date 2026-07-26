import routes.auth


def test_google_login_creates_user(auth_client, monkeypatch):
    test_client, fake_db = auth_client

    async def fake_verify_google_id_token(_):
      return {
          "sub": "google-123",
          "email": "google@example.com",
          "email_verified": "true",
          "name": "Google User",
          "picture": "https://example.com/avatar.png",
          "aud": "test-client",
      }

    monkeypatch.setattr(routes.auth, "verify_google_id_token", fake_verify_google_id_token)

    response = test_client.post(
        "/api/auth/google",
        json={"id_token": "valid-token", "role": "helper", "skills": ["plumber"]},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["access_token"]
    assert data["email"] == "google@example.com"
    assert data["role"] == "helper"
    assert data["skills"] == ["plumber"]
    assert any(user.get("google_sub") == "google-123" for user in fake_db.users.documents)


def test_google_login_links_existing_email(auth_client, monkeypatch):
    test_client, fake_db = auth_client

    async def fake_verify_google_id_token(_):
      return {
          "sub": "google-linked",
          "email": "buyer@example.com",
          "email_verified": "true",
          "name": "Buyer",
      }

    monkeypatch.setattr(routes.auth, "verify_google_id_token", fake_verify_google_id_token)

    response = test_client.post("/api/auth/google", json={"id_token": "valid-token"})

    assert response.status_code == 200
    buyer = next(user for user in fake_db.users.documents if user["email"] == "buyer@example.com")
    assert buyer["google_sub"] == "google-linked"


def test_google_login_accepts_access_token(auth_client, monkeypatch):
    test_client, fake_db = auth_client

    async def fake_verify_google_access_token(_):
        return {
            "sub": "google-access-token",
            "email": "access@example.com",
            "email_verified": True,
            "name": "Access Token User",
        }

    monkeypatch.setattr(routes.auth, "verify_google_access_token", fake_verify_google_access_token)

    response = test_client.post(
        "/api/auth/google",
        json={"access_token": "valid-access-token", "role": "need_help"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == "access@example.com"
    assert any(user.get("google_sub") == "google-access-token" for user in fake_db.users.documents)
