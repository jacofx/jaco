from bson import ObjectId


def test_job_accept_status_and_review_lifecycle(client):
    test_client, fake_db, active_user, _ = client

    create_response = test_client.post(
        "/api/jobs",
        json={
            "title": "Leaking sink repair",
            "description": "Kitchen sink is leaking",
            "budget": 120,
            "category": "plumber",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        },
    )

    assert create_response.status_code == 200
    job_id = create_response.json()["_id"]

    posted_jobs_response = test_client.get("/api/jobs/my/posted")
    assert posted_jobs_response.status_code == 200
    assert len(posted_jobs_response.json()) == 1

    active_user.update({"_id": str(fake_db.helper_id), "role": "helper", "name": "Helper"})

    accept_response = test_client.put(f"/api/jobs/{job_id}/accept")
    assert accept_response.status_code == 200
    accept_data = accept_response.json()
    assert accept_data["status"] == "accepted"
    assert accept_data["helper_id"] == str(fake_db.helper_id)

    accepted_jobs_response = test_client.get("/api/jobs/my/accepted")
    assert accepted_jobs_response.status_code == 200
    accepted_jobs = accepted_jobs_response.json()
    assert len(accepted_jobs) == 1
    assert accepted_jobs[0]["_id"] == job_id
    assert accepted_jobs[0]["user_name"] == "Buyer"

    status_response = test_client.put(
        f"/api/jobs/{job_id}/status",
        json={"status": "completed"},
    )
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "completed"

    active_user.update({"_id": str(fake_db.buyer_id), "role": "need_help", "name": "Buyer"})

    review_response = test_client.post(
        "/api/reviews",
        json={
            "job_id": job_id,
            "helper_id": str(fake_db.helper_id),
            "rating": 5,
            "comment": "Fixed it quickly",
        },
    )

    assert review_response.status_code == 200
    assert review_response.json()["message"] == "Review created successfully"
    assert len(fake_db.reviews.documents) == 1

    helper_record = next(
        user for user in fake_db.users.documents if user["_id"] == fake_db.helper_id
    )
    assert helper_record["rating"] == 5.0
    assert helper_record["rating_count"] == 1
    assert helper_record["completed_jobs_count"] == 1


def test_non_helper_cannot_accept_job(client):
    test_client, _, _, _ = client

    create_response = test_client.post(
        "/api/jobs",
        json={
            "title": "Need ceiling fan repair",
            "description": "Fan stopped spinning",
            "budget": 75,
            "category": "electrician",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        },
    )
    assert create_response.status_code == 200
    job_id = create_response.json()["_id"]

    accept_response = test_client.put(f"/api/jobs/{job_id}/accept")

    assert accept_response.status_code == 403
    assert accept_response.json()["detail"] == "Only helpers can accept jobs"


def test_cannot_accept_job_twice(client):
    test_client, fake_db, active_user, _ = client

    create_response = test_client.post(
        "/api/jobs",
        json={
            "title": "Fix broken socket",
            "description": "Wall socket sparks",
            "budget": 95,
            "category": "electrician",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        },
    )
    assert create_response.status_code == 200
    job_id = create_response.json()["_id"]

    active_user.update({"_id": str(fake_db.helper_id), "role": "helper", "name": "Helper"})

    first_accept = test_client.put(f"/api/jobs/{job_id}/accept")
    assert first_accept.status_code == 200

    second_accept = test_client.put(f"/api/jobs/{job_id}/accept")
    assert second_accept.status_code == 400
    assert second_accept.json()["detail"] == "Job is not available"


def test_unrelated_user_cannot_update_job_status(client):
    test_client, _, active_user, _ = client

    create_response = test_client.post(
        "/api/jobs",
        json={
            "title": "Repair washing machine",
            "description": "Machine leaks water",
            "budget": 150,
            "category": "appliance",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        },
    )
    assert create_response.status_code == 200
    job_id = create_response.json()["_id"]

    active_user.update({"_id": str(ObjectId()), "role": "helper", "name": "Intruder"})

    status_response = test_client.put(
        f"/api/jobs/{job_id}/status",
        json={"status": "completed"},
    )

    assert status_response.status_code == 403
    assert status_response.json()["detail"] == "Not authorized"


def test_review_requires_completed_job(client):
    test_client, fake_db, active_user, _ = client

    create_response = test_client.post(
        "/api/jobs",
        json={
            "title": "Fix leaking tap",
            "description": "Bathroom tap keeps dripping",
            "budget": 60,
            "category": "plumber",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        },
    )
    assert create_response.status_code == 200
    job_id = create_response.json()["_id"]

    active_user.update({"_id": str(fake_db.buyer_id), "role": "need_help", "name": "Buyer"})

    review_response = test_client.post(
        "/api/reviews",
        json={
            "job_id": job_id,
            "helper_id": str(fake_db.helper_id),
            "rating": 4,
            "comment": "Too early for a review",
        },
    )

    assert review_response.status_code == 400
    assert review_response.json()["detail"] == "Job must be completed to leave a review"


def test_duplicate_review_is_rejected(client):
    test_client, fake_db, active_user, _ = client

    create_response = test_client.post(
        "/api/jobs",
        json={
            "title": "Repair shower pipe",
            "description": "Pipe behind shower is leaking",
            "budget": 140,
            "category": "plumber",
            "location": {"lat": 6.45, "lng": 3.39, "address": "Lagos"},
        },
    )
    assert create_response.status_code == 200
    job_id = create_response.json()["_id"]

    active_user.update({"_id": str(fake_db.helper_id), "role": "helper", "name": "Helper"})
    accept_response = test_client.put(f"/api/jobs/{job_id}/accept")
    assert accept_response.status_code == 200

    status_response = test_client.put(
        f"/api/jobs/{job_id}/status",
        json={"status": "completed"},
    )
    assert status_response.status_code == 200

    active_user.update({"_id": str(fake_db.buyer_id), "role": "need_help", "name": "Buyer"})

    first_review = test_client.post(
        "/api/reviews",
        json={
            "job_id": job_id,
            "helper_id": str(fake_db.helper_id),
            "rating": 5,
            "comment": "Great work",
        },
    )
    assert first_review.status_code == 200

    second_review = test_client.post(
        "/api/reviews",
        json={
            "job_id": job_id,
            "helper_id": str(fake_db.helper_id),
            "rating": 3,
            "comment": "Trying to review twice",
        },
    )

    assert second_review.status_code == 400
    assert second_review.json()["detail"] == "Review already exists for this job"
