from bson import ObjectId


def test_notifications_list_and_mark_read(client):
    test_client, fake_db, active_user, _ = client

    notification_id = ObjectId()
    fake_db.notifications.documents.extend([
        {
            "_id": notification_id,
            "user_id": fake_db.buyer_id,
            "type": "promotion_activated",
            "title": "Promotion activated",
            "message": "Your job is now boosted.",
            "job_id": None,
            "data": {"ad_package": "boost"},
            "read": False,
            "created_at": 2,
        },
        {
            "_id": ObjectId(),
            "user_id": fake_db.buyer_id,
            "type": "ad_payment_completed",
            "title": "Payment confirmed",
            "message": "Your payment was confirmed.",
            "job_id": None,
            "data": {"package_id": "top"},
            "read": True,
            "created_at": 1,
        },
    ])

    list_response = test_client.get("/api/notifications")
    assert list_response.status_code == 200
    notifications = list_response.json()
    assert len(notifications) == 2
    assert notifications[0]["_id"] == str(notification_id)
    assert notifications[0]["read"] is False

    update_response = test_client.put(
        f"/api/notifications/{notification_id}",
        json={"read": True},
    )
    assert update_response.status_code == 200
    assert update_response.json()["read"] is True
    assert fake_db.notifications.documents[0]["read"] is True


def test_cannot_update_another_users_notification(client):
    test_client, fake_db, _, _ = client

    notification_id = ObjectId()
    fake_db.notifications.documents.append({
        "_id": notification_id,
        "user_id": fake_db.helper_id,
        "type": "promotion_activated",
        "title": "Promotion activated",
        "message": "Another user's notification.",
        "job_id": None,
        "data": {},
        "read": False,
        "created_at": 1,
    })

    update_response = test_client.put(
        f"/api/notifications/{notification_id}",
        json={"read": True},
    )
    assert update_response.status_code == 403
    assert update_response.json()["detail"] == "Not authorized"
