def test_message_flow_and_conversation_summary(client):
    test_client, fake_db, active_user, _ = client

    create_response = test_client.post(
        "/api/jobs",
        json={
            "title": "Fix hallway light",
            "description": "Bulb fitting is broken",
            "budget": 80,
            "category": "electrician",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        },
    )
    assert create_response.status_code == 200
    job_id = create_response.json()["_id"]

    active_user.update({"_id": str(fake_db.helper_id), "role": "helper", "name": "Helper"})
    accept_response = test_client.put(f"/api/jobs/{job_id}/accept")
    assert accept_response.status_code == 200

    helper_message = test_client.post(
        "/api/messages",
        json={
            "job_id": job_id,
            "receiver_id": str(fake_db.buyer_id),
            "message": "I can be there in 20 minutes.",
        },
    )
    assert helper_message.status_code == 200
    helper_message_data = helper_message.json()
    assert helper_message_data["sender_id"] == str(fake_db.helper_id)

    active_user.update({"_id": str(fake_db.buyer_id), "role": "need_help", "name": "Buyer"})

    buyer_message = test_client.post(
        "/api/messages",
        json={
            "job_id": job_id,
            "receiver_id": str(fake_db.helper_id),
            "message": "That works for me.",
        },
    )
    assert buyer_message.status_code == 200
    assert len(fake_db.messages.documents) == 2

    messages_response = test_client.get(f"/api/messages/jobs/{job_id}")
    assert messages_response.status_code == 200
    messages = messages_response.json()
    assert len(messages) == 2
    assert messages[0]["message"] == "I can be there in 20 minutes."
    assert messages[1]["message"] == "That works for me."

    conversations_response = test_client.get("/api/messages/conversations")
    assert conversations_response.status_code == 200
    conversations = conversations_response.json()
    assert len(conversations) == 1
    assert conversations[0]["job_id"] == job_id
    assert conversations[0]["other_user"]["id"] == str(fake_db.helper_id)
    assert conversations[0]["other_user"]["name"] == "Helper"
    assert conversations[0]["last_message"] == "That works for me."
    assert conversations[0]["unread_count"] == 1


def test_cannot_read_messages_for_unrelated_job(client):
    test_client, _, active_user, _ = client

    create_response = test_client.post(
        "/api/jobs",
        json={
            "title": "Repair door lock",
            "description": "Front door lock is jammed",
            "budget": 55,
            "category": "carpenter",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        },
    )
    assert create_response.status_code == 200
    job_id = create_response.json()["_id"]

    active_user.update({"_id": "69c000000000000000000001", "role": "helper", "name": "Intruder"})

    messages_response = test_client.get(f"/api/messages/jobs/{job_id}")
    assert messages_response.status_code == 403
    assert messages_response.json()["detail"] == "Not authorized"


def test_cannot_send_message_for_unrelated_job(client):
    test_client, _, active_user, _ = client

    create_response = test_client.post(
        "/api/jobs",
        json={
            "title": "Repair gate",
            "description": "Metal gate stuck",
            "budget": 100,
            "category": "welder",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        },
    )
    assert create_response.status_code == 200
    job_id = create_response.json()["_id"]

    active_user.update({"_id": "69c000000000000000000001", "role": "helper", "name": "Intruder"})

    message_response = test_client.post(
        "/api/messages",
        json={
            "job_id": job_id,
            "receiver_id": "69c000000000000000000002",
            "message": "I should not be able to send this.",
        },
    )

    assert message_response.status_code == 403
    assert message_response.json()["detail"] == "Not authorized"


def test_message_receiver_must_be_other_job_participant(client):
    test_client, fake_db, active_user, _ = client

    create_response = test_client.post(
        "/api/jobs",
        json={
            "title": "Fix outlet",
            "description": "Outlet is dead",
            "budget": 85,
            "category": "electrician",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        },
    )
    assert create_response.status_code == 200
    job_id = create_response.json()["_id"]

    active_user.update({"_id": str(fake_db.helper_id), "role": "helper", "name": "Helper"})
    accept_response = test_client.put(f"/api/jobs/{job_id}/accept")
    assert accept_response.status_code == 200

    message_response = test_client.post(
        "/api/messages",
        json={
            "job_id": job_id,
            "receiver_id": str(fake_db.helper_id),
            "message": "Talking to myself.",
        },
    )

    assert message_response.status_code == 400
    assert message_response.json()["detail"] == "Receiver must be the other job participant"
