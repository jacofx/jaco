import core


async def _fake_send_signup_verification_email(email: str, code: str):
    return None


def request_signup_code(test_client, monkeypatch, email="new-user@example.com", code="123456"):
    monkeypatch.setattr(core, "send_signup_verification_email", _fake_send_signup_verification_email)
    monkeypatch.setattr(core, "generate_email_verification_code", lambda: code)

    response = test_client.post("/api/auth/send-email-code", json={"email": email})

    assert response.status_code == 200
    assert response.json()["message"] == "Verification code sent"
    return code


def test_register_login_and_me_flow(auth_client, monkeypatch):
    test_client, fake_db = auth_client
    code = request_signup_code(test_client, monkeypatch)

    register_response = test_client.post(
        "/api/auth/register",
        json={
            "email": "new-user@example.com",
            "password": "super-secret",
            "name": "New User",
            "role": "need_help",
            "email_verification_code": code,
        },
    )

    assert register_response.status_code == 200
    register_data = register_response.json()
    assert register_data["token_type"] == "bearer"
    assert register_data["name"] == "New User"
    assert register_data["role"] == "need_help"

    stored_user = fake_db.users.documents[-1]
    assert stored_user["email"] == "new-user@example.com"
    assert stored_user["password_hash"] != "super-secret"

    login_response = test_client.post(
        "/api/auth/login",
        json={"email": "new-user@example.com", "password": "super-secret"},
    )

    assert login_response.status_code == 200
    login_data = login_response.json()
    assert login_data["user_id"] == register_data["user_id"]

    me_response = test_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {login_data['access_token']}"},
    )

    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["_id"] == register_data["user_id"]
    assert me_data["email"] == "new-user@example.com"
    assert me_data["name"] == "New User"
    assert "password_hash" not in me_data


def test_send_email_code_rejects_duplicate_email(auth_client, monkeypatch):
    test_client, fake_db = auth_client

    fake_db.users.documents.append(
        {
            "_id": fake_db.buyer_id,
            "email": "duplicate@example.com",
            "name": "Existing User",
            "role": "need_help",
            "password_hash": "hashed",
        }
    )

    monkeypatch.setattr(core, "send_signup_verification_email", _fake_send_signup_verification_email)
    response = test_client.post("/api/auth/send-email-code", json={"email": "duplicate@example.com"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


def test_register_rejects_duplicate_email(auth_client, monkeypatch):
    test_client, _ = auth_client
    code = request_signup_code(test_client, monkeypatch, email="duplicate@example.com")

    first_response = test_client.post(
        "/api/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "super-secret",
            "name": "First User",
            "role": "need_help",
            "email_verification_code": code,
        },
    )
    assert first_response.status_code == 200

    second_response = test_client.post(
        "/api/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "another-secret",
            "name": "Second User",
            "role": "need_help",
            "email_verification_code": code,
        },
    )

    assert second_response.status_code == 400
    assert second_response.json()["detail"] == "Email already registered"


def test_register_requires_verification_code_for_email_signup(auth_client):
    test_client, _ = auth_client

    register_response = test_client.post(
        "/api/auth/register",
        json={
            "email": "new-user@example.com",
            "password": "super-secret",
            "name": "New User",
            "role": "need_help",
        },
    )

    assert register_response.status_code == 400
    assert register_response.json()["detail"] == "Email verification code required"


def test_register_rejects_invalid_verification_code(auth_client, monkeypatch):
    test_client, _ = auth_client
    request_signup_code(test_client, monkeypatch, code="123456")

    register_response = test_client.post(
        "/api/auth/register",
        json={
            "email": "new-user@example.com",
            "password": "super-secret",
            "name": "New User",
            "role": "need_help",
            "email_verification_code": "654321",
        },
    )

    assert register_response.status_code == 400
    assert register_response.json()["detail"] == "Invalid email verification code"


def test_login_rejects_invalid_credentials(auth_client, monkeypatch):
    test_client, _ = auth_client
    code = request_signup_code(test_client, monkeypatch, email="login-user@example.com")

    register_response = test_client.post(
        "/api/auth/register",
        json={
            "email": "login-user@example.com",
            "password": "super-secret",
            "name": "Login User",
            "role": "need_help",
            "email_verification_code": code,
        },
    )
    assert register_response.status_code == 200

    login_response = test_client.post(
        "/api/auth/login",
        json={"email": "login-user@example.com", "password": "wrong-password"},
    )

    assert login_response.status_code == 401
    assert login_response.json()["detail"] == "Invalid credentials"


def test_login_requires_email_or_phone(auth_client):
    test_client, _ = auth_client

    login_response = test_client.post(
        "/api/auth/login",
        json={"password": "super-secret"},
    )

    assert login_response.status_code == 400
    assert login_response.json()["detail"] == "Email or phone required"


def test_register_requires_email_or_phone(auth_client):
    test_client, _ = auth_client

    register_response = test_client.post(
        "/api/auth/register",
        json={
            "password": "super-secret",
            "name": "No Contact",
            "role": "need_help",
        },
    )

    assert register_response.status_code == 400
    assert register_response.json()["detail"] == "Email or phone required"


def test_register_rejects_invalid_role(auth_client):
    test_client, _ = auth_client

    register_response = test_client.post(
        "/api/auth/register",
        json={
            "email": "bad-role@example.com",
            "password": "super-secret",
            "name": "Bad Role",
            "role": "admin",
            "email_verification_code": "123456",
        },
    )

    assert register_response.status_code == 422
