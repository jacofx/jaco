from bson import ObjectId


def test_helpers_calculate_distance_for_zero_coordinates(client):
    test_client, fake_db, _, _ = client

    fake_db.users.documents[1]["location"] = {
        "lat": 0.5,
        "lng": 0.5,
        "address": "Near Gulf",
    }

    helpers_response = test_client.get("/api/helpers?lat=0&lng=0")

    assert helpers_response.status_code == 200
    helpers = helpers_response.json()
    assert len(helpers) == 1
    assert helpers[0]["_id"] == str(fake_db.helper_id)
    assert helpers[0]["distance"] is not None
