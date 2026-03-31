from datetime import datetime

from bson import ObjectId

import core


async def create_review(current_user_id: str, review_data: core.ReviewCreate):
    job = await core.db.jobs.find_one({"_id": ObjectId(review_data.job_id)})
    if not job:
        raise core.HTTPException(status_code=404, detail="Job not found")
    if job["status"] != core.JobStatus.COMPLETED:
        raise core.HTTPException(status_code=400, detail="Job must be completed to leave a review")
    if str(job["user_id"]) != current_user_id:
        raise core.HTTPException(status_code=403, detail="Only job poster can leave a review")
    if not job.get("helper_id") or str(job["helper_id"]) != review_data.helper_id:
        raise core.HTTPException(status_code=400, detail="Review helper must match the job helper")

    existing_review = await core.db.reviews.find_one({"job_id": review_data.job_id})
    if existing_review:
        raise core.HTTPException(status_code=400, detail="Review already exists for this job")

    review_dict = {
        "job_id": review_data.job_id,
        "helper_id": review_data.helper_id,
        "user_id": current_user_id,
        "rating": review_data.rating,
        "comment": review_data.comment,
        "created_at": datetime.utcnow(),
    }
    await core.db.reviews.insert_one(review_dict)

    helper = await core.db.users.find_one({"_id": ObjectId(review_data.helper_id)})
    if helper:
        new_total_rating = helper.get("total_rating", 0) + review_data.rating
        new_rating_count = helper.get("rating_count", 0) + 1
        new_rating = new_total_rating / new_rating_count
        new_completed_jobs = helper.get("completed_jobs_count", 0) + 1
        await core.db.users.update_one(
            {"_id": ObjectId(review_data.helper_id)},
            {"$set": {
                "total_rating": new_total_rating,
                "rating_count": new_rating_count,
                "rating": round(new_rating, 2),
                "completed_jobs_count": new_completed_jobs,
            }},
        )

    return {"message": "Review created successfully"}


async def get_helper_reviews(helper_id: str):
    try:
        reviews = await core.db.reviews.find({"helper_id": helper_id}).sort("created_at", -1).to_list(100)
        user_ids = list(set([review["user_id"] for review in reviews]))
        users = await core.db.users.find(
            {"_id": {"$in": [ObjectId(uid) for uid in user_ids]}},
            {"_id": 1, "name": 1},
        ).to_list(None)
        user_map = {str(user["_id"]): user for user in users}

        for review in reviews:
            review["_id"] = str(review["_id"])
            user_id_str = str(review["user_id"])
            if user_id_str in user_map:
                review["user_name"] = user_map[user_id_str]["name"]
        return reviews
    except Exception as exc:
        raise core.HTTPException(status_code=400, detail=str(exc))
