from datetime import datetime, timedelta
from types import SimpleNamespace

from bson import ObjectId

import core
import server


def test_demo_checkout_and_promoted_job_creation(client):
    test_client, fake_db, _, _ = client

    checkout_response = test_client.post("/api/ads/checkout", json={"package_id": "boost"})
    assert checkout_response.status_code == 200
    checkout_data = checkout_response.json()
    assert checkout_data["payment"]["status"] == "completed"

    payment_id = checkout_data["payment"]["_id"]
    job_response = test_client.post(
        "/api/jobs",
        json={
            "title": "Boost my plumbing request",
            "description": "Need urgent repair",
            "budget": 180,
            "category": "plumber",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
            "ad_package": "boost",
            "payment_id": payment_id,
            "promotion": {"id": "boost"},
        },
    )

    assert job_response.status_code == 200
    job_data = job_response.json()
    assert job_data["ad_package"] == "boost"
    assert job_data["priority_level"] == 1

    saved_payment = fake_db.ad_payments.documents[0]
    assert saved_payment["job_id"] is not None

    notification_types = [notification["type"] for notification in fake_db.notifications.documents]
    assert "ad_payment_completed" in notification_types
    assert "promotion_activated" in notification_types


def test_promoted_job_uses_package_defaults_when_override_fields_are_omitted(client):
    test_client, fake_db, _, _ = client

    checkout_response = test_client.post("/api/ads/checkout", json={"package_id": "top"})
    assert checkout_response.status_code == 200
    payment_id = checkout_response.json()["payment"]["_id"]

    job_response = test_client.post(
        "/api/jobs",
        json={
            "title": "Top placement without explicit overrides",
            "description": "Need featured visibility",
            "budget": 250,
            "category": "electrician",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
            "ad_package": "top",
            "payment_id": payment_id,
            "promotion": {"id": "top"},
        },
    )

    assert job_response.status_code == 200
    job_data = job_response.json()
    assert job_data["ad_package"] == "top"
    assert job_data["priority_level"] == 2
    assert job_data["is_featured"] is True
    assert job_data["is_urgent"] is True
    assert job_data["promotion_days"] == 14
    assert job_data["promotion"]["id"] == "top"
    assert job_data["promotion"]["priority_level"] == 2
    assert job_data["promotion"]["featured"] is True
    assert job_data["promotion"]["urgent"] is True
    assert job_data["promotion_expires_at"] is not None

    saved_job = fake_db.jobs.documents[0]
    assert saved_job["priority_level"] == 2
    assert saved_job["is_featured"] is True
    assert saved_job["is_urgent"] is True
    assert saved_job["promotion_days"] == 14
    assert saved_job["promotion_expires_at"] is not None


def test_stripe_verify_marks_payment_completed(client):
    test_client, fake_db, _, monkeypatch = client

    monkeypatch.setattr(core, "PAYMENTS_MODE", "stripe")
    monkeypatch.setattr(core.stripe, "api_key", "sk_test_123")
    monkeypatch.setattr(
        core.stripe.checkout.Session,
        "create",
        lambda **kwargs: SimpleNamespace(id="cs_test_123", url="https://checkout.stripe.test/session"),
    )
    monkeypatch.setattr(
        core.stripe.checkout.Session,
        "retrieve",
        lambda session_id: SimpleNamespace(id=session_id, payment_status="paid"),
    )

    checkout_response = test_client.post("/api/ads/checkout", json={"package_id": "top"})
    assert checkout_response.status_code == 200
    checkout_data = checkout_response.json()
    assert checkout_data["requires_redirect"] is True
    assert checkout_data["payment"]["status"] == "pending"

    payment_id = checkout_data["payment"]["_id"]
    verify_response = test_client.post(
        "/api/ads/verify",
        json={"payment_id": payment_id, "session_id": "cs_test_123"},
    )

    assert verify_response.status_code == 200
    assert verify_response.json()["status"] == "completed"
    assert fake_db.ad_payments.documents[0]["status"] == "completed"


def test_stripe_webhook_completes_pending_payment(client):
    test_client, fake_db, _, monkeypatch = client

    monkeypatch.setattr(core, "PAYMENTS_MODE", "stripe")
    monkeypatch.setattr(core.stripe, "api_key", "sk_test_123")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test")
    monkeypatch.setattr(
        core.stripe.checkout.Session,
        "create",
        lambda **kwargs: SimpleNamespace(id="cs_test_webhook", url="https://checkout.stripe.test/session"),
    )
    monkeypatch.setattr(
        core.stripe.Webhook,
        "construct_event",
        lambda payload, signature, secret: {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_webhook",
                    "payment_status": "paid",
                    "metadata": {"payment_id": str(fake_db.ad_payments.documents[0]["_id"])},
                }
            },
        },
    )

    checkout_response = test_client.post("/api/ads/checkout", json={"package_id": "boost"})
    assert checkout_response.status_code == 200
    assert fake_db.ad_payments.documents[0]["status"] == "pending"

    webhook_response = test_client.post(
        "/api/ads/webhook/stripe",
        content="{}",
        headers={"stripe-signature": "signature"},
    )

    assert webhook_response.status_code == 200
    assert fake_db.ad_payments.documents[0]["status"] == "completed"


def test_expired_promotions_are_downgraded_and_notified(client):
    test_client, fake_db, active_user, _ = client

    expired_job_id = ObjectId()
    fake_db.jobs.documents.append({
        "_id": expired_job_id,
        "user_id": ObjectId(active_user["_id"]),
        "helper_id": None,
        "status": "posted",
        "title": "Old promoted listing",
        "description": "Expired promotion",
        "budget": 90,
        "category": "plumber",
        "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        "ad_package": "top",
        "promotion": server.PROMOTION_PRESETS["top"].copy(),
        "promotion_days": 14,
        "priority_level": 2,
        "is_featured": True,
        "is_urgent": True,
        "promotion_expires_at": datetime.utcnow() - timedelta(days=1),
        "created_at": datetime.utcnow() - timedelta(days=10),
        "updated_at": datetime.utcnow() - timedelta(days=10),
    })

    jobs_response = test_client.get("/api/jobs")
    assert jobs_response.status_code == 200
    job_data = jobs_response.json()[0]
    assert job_data["ad_package"] == "free"
    assert job_data["priority_level"] == 0

    notification_types = [notification["type"] for notification in fake_db.notifications.documents]
    assert "promotion_expired" in notification_types
