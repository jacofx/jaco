from bson import ObjectId


def create_problem(test_client):
    response = test_client.post(
        "/api/jobs",
        json={
            "title": "Urgent leaking sink repair",
            "description": "Kitchen sink is leaking and unsafe today",
            "budget": 20000,
            "category": "plumber",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        },
    )
    assert response.status_code == 200
    return response.json()


def test_ai_analysis_endpoint_returns_matches(client):
    test_client, _, _, _ = client

    response = test_client.post(
        "/api/ai/analyze-problem",
        json={
            "title": "Need urgent pipe repair",
            "description": "Water is leaking under the sink today",
            "budget": 25000,
            "category": "plumber",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["category_id"] == "plumber"
    assert data["urgency_score"] >= 70
    assert "recommended_community_ids" in data
    assert "match_recommendations" in data


def test_job_persists_ai_analysis_and_matches(client):
    test_client, _, _, _ = client

    job = create_problem(test_client)

    assert job["ai_analysis"]["category_id"] == "plumber"
    assert job["solution_flow"]["stage"] == "ai_analyzed"
    assert "match_recommendations" in job

    fetched = test_client.get(f"/api/jobs/{job['_id']}")
    assert fetched.status_code == 200
    assert fetched.json()["ai_analysis"]["category_id"] == "plumber"


def test_offer_acceptance_creates_booking_and_payment(client):
    test_client, fake_db, active_user, _ = client
    job = create_problem(test_client)

    active_user.update({"_id": str(fake_db.helper_id), "role": "helper", "name": "Helper"})
    offer_response = test_client.post(
        f"/api/jobs/{job['_id']}/offers",
        json={
            "quote": 18000,
            "message": "I can fix this today.",
            "timeline": "Same day",
            "availability": "Today 4pm",
            "provider_type": "expert",
        },
    )
    assert offer_response.status_code == 200
    offer = offer_response.json()
    assert offer["status"] == "pending"

    active_user.update({"_id": str(fake_db.buyer_id), "role": "need_help", "name": "Buyer"})
    accept_response = test_client.post(f"/api/offers/{offer['_id']}/accept")
    assert accept_response.status_code == 200
    booking = accept_response.json()["booking"]
    assert booking["commission"] == 1800
    assert booking["status"] == "pending_payment"

    payment_response = test_client.post(f"/api/bookings/{booking['_id']}/payment", json={"provider": "demo"})
    assert payment_response.status_code == 200
    assert payment_response.json()["payment"]["commission"] == 1800

    updated_job = test_client.get(f"/api/jobs/{job['_id']}").json()
    assert updated_job["status"] == "in_progress"


def test_review_outcome_updates_trust_score(client):
    test_client, fake_db, active_user, _ = client
    job = create_problem(test_client)

    active_user.update({"_id": str(fake_db.helper_id), "role": "helper", "name": "Helper"})
    test_client.put(f"/api/jobs/{job['_id']}/accept")
    test_client.put(f"/api/jobs/{job['_id']}/status", json={"status": "completed"})

    active_user.update({"_id": str(fake_db.buyer_id), "role": "need_help", "name": "Buyer"})
    review_response = test_client.post(
        "/api/reviews",
        json={
            "job_id": job["_id"],
            "helper_id": str(fake_db.helper_id),
            "rating": 5,
            "quality": 5,
            "speed": 4,
            "price_fairness": 5,
            "communication": 4,
            "solved": True,
            "comment": "Solved well",
        },
    )
    assert review_response.status_code == 200

    helper = next(user for user in fake_db.users.documents if user["_id"] == fake_db.helper_id)
    assert helper["success_rate"] == 100
    assert helper["trust_score"] > 70


def test_communities_join_and_referral_tracking(client):
    test_client, fake_db, active_user, _ = client

    communities_response = test_client.get("/api/communities")
    assert communities_response.status_code == 200
    community_id = communities_response.json()[0]["_id"]

    join_response = test_client.post(f"/api/communities/{community_id}/join")
    assert join_response.status_code == 200
    assert join_response.json()["message"] == "Community joined"

    referral_response = test_client.post(
        "/api/referrals",
        json={"community_id": community_id, "invitee_contact": "friend@example.com", "message": "Join SolveConnect"},
    )
    assert referral_response.status_code == 200
    assert referral_response.json()["referral"]["reward_points"] == 25

    buyer = next(user for user in fake_db.users.documents if user["_id"] == ObjectId(active_user["_id"]))
    assert buyer["invite_count"] == 1
    assert buyer["community_reward_points"] == 25
