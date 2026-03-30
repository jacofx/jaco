import server


def test_health_reports_degraded_when_database_is_unavailable(auth_client, monkeypatch):
    test_client, _ = auth_client

    async def failing_ping():
        raise RuntimeError("database unavailable")

    monkeypatch.setattr("server.core.ping_database", failing_ping)

    response = test_client.get("/health")

    assert response.status_code == 503
    assert response.json() == {
        "detail": {
            "status": "degraded",
            "database": "error",
            "payments_mode": server.PAYMENTS_MODE,
            "database_error": "database unavailable",
        }
    }
