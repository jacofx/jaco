from datetime import datetime
from typing import Optional

from bson import ObjectId

import core
from services.notifications import create_notification
from services.ai import analyze_problem
from services.payments import validate_job_payment
from services.promotions import hydrate_job, normalize_job_promotion

ALLOWED_STATUS_TRANSITIONS = {
    core.JobStatus.ACCEPTED: {core.JobStatus.IN_PROGRESS, core.JobStatus.COMPLETED},
    core.JobStatus.IN_PROGRESS: {core.JobStatus.COMPLETED},
}


async def create_job(current_user: dict, job_dict: dict):
    payment = await validate_job_payment(current_user, job_dict)
    analysis = job_dict.get("ai_analysis") or await analyze_problem(job_dict)
    match_recommendations = job_dict.get("match_recommendations") or analysis.get("match_recommendations", {})
    job_dict["user_id"] = current_user["_id"]
    job_dict["helper_id"] = None
    job_dict["status"] = core.JobStatus.POSTED
    job_dict["ai_analysis"] = analysis
    job_dict["match_recommendations"] = match_recommendations
    job_dict["solution_flow"] = job_dict.get("solution_flow") or {
        "stage": "ai_analyzed",
        "urgency_score": analysis.get("urgency_score"),
        "matched_experts": analysis.get("recommended_expert_ids", []),
        "matched_businesses": analysis.get("recommended_business_ids", []),
        "matched_communities": analysis.get("recommended_community_ids", []),
    }
    job_dict["created_at"] = datetime.utcnow()
    job_dict["updated_at"] = datetime.utcnow()
    job_dict = normalize_job_promotion(job_dict)

    result = await core.db.jobs.insert_one(job_dict)
    job_dict["_id"] = str(result.inserted_id)
    job_dict["user_id"] = str(job_dict["user_id"])

    if payment:
        await core.db.ad_payments.update_one(
            {"_id": ObjectId(payment["_id"])},
            {"$set": {"job_id": ObjectId(job_dict["_id"]), "updated_at": datetime.utcnow()}},
        )

    if job_dict["ad_package"] != "free":
        await create_notification(
            current_user["_id"],
            "promotion_activated",
            "Promotion activated",
            f"{job_dict['title']} is now running as a {job_dict['promotion']['label'].lower()}.",
            job_id=ObjectId(job_dict["_id"]),
            data={"ad_package": job_dict["ad_package"], "priority_level": job_dict["priority_level"]},
        )
    return job_dict


async def list_jobs(
    status: Optional[str] = None,
    category: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
):
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category

    jobs = await core.db.jobs.find(query).to_list(100)
    user_ids = list(set([job["user_id"] for job in jobs]))
    users = await core.db.users.find(
        {"_id": {"$in": [ObjectId(uid) for uid in user_ids]}},
        {"_id": 1, "name": 1},
    ).to_list(None)
    user_map = {str(user["_id"]): user for user in users}

    result = []
    for job in jobs:
        job = await hydrate_job(job)
        if job["user_id"] in user_map:
            job["user_name"] = user_map[job["user_id"]]["name"]
        if lat is not None and lng is not None and job.get("location"):
            job["distance"] = core.calculate_distance(lat, lng, job["location"]["lat"], job["location"]["lng"])
        else:
            job["distance"] = None
        result.append(job)

    if lat is not None and lng is not None:
        result = sorted(
            result,
            key=lambda item: (
                -(item.get("priority_level") or 0),
                item["distance"] if item["distance"] is not None else float("inf"),
                -(item.get("created_at").timestamp() if item.get("created_at") else 0),
            ),
        )
    else:
        result = sorted(
            result,
            key=lambda item: (
                -(item.get("priority_level") or 0),
                -(item.get("created_at").timestamp() if item.get("created_at") else 0),
            ),
        )
    return result


async def get_job_by_id(job_id: str):
    try:
        job = await core.db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise core.HTTPException(status_code=404, detail="Job not found")
        return await hydrate_job(job)
    except core.HTTPException:
        raise
    except Exception as exc:
        raise core.HTTPException(status_code=400, detail=str(exc))


async def get_my_posted_jobs(current_user_id: str):
    jobs = await core.db.jobs.find({"user_id": current_user_id}).sort("created_at", -1).to_list(100)
    helper_ids = [job["helper_id"] for job in jobs if job.get("helper_id")]
    if helper_ids:
        helpers = await core.db.users.find(
            {"_id": {"$in": [ObjectId(helper_id) for helper_id in helper_ids]}},
            {"_id": 1, "name": 1, "profile_photo": 1},
        ).to_list(None)
        helper_map = {str(helper["_id"]): helper for helper in helpers}
    else:
        helper_map = {}

    result = []
    for job in jobs:
        job = await hydrate_job(job)
        if job.get("helper_id") and job["helper_id"] in helper_map:
            job["helper_name"] = helper_map[job["helper_id"]]["name"]
            job["helper_photo"] = helper_map[job["helper_id"]].get("profile_photo")
        result.append(job)
    return result


async def get_my_accepted_jobs(current_user_id: str):
    jobs = await core.db.jobs.find({"helper_id": current_user_id}).sort("created_at", -1).to_list(100)
    user_ids = [job["user_id"] for job in jobs]
    users = await core.db.users.find(
        {"_id": {"$in": [ObjectId(uid) for uid in user_ids]}},
        {"_id": 1, "name": 1, "profile_photo": 1},
    ).to_list(None)
    user_map = {str(user["_id"]): user for user in users}

    result = []
    for job in jobs:
        job = await hydrate_job(job)
        if job["user_id"] in user_map:
            job["user_name"] = user_map[job["user_id"]]["name"]
            job["user_photo"] = user_map[job["user_id"]].get("profile_photo")
        result.append(job)
    return result


async def accept_job(job_id: str, current_user: dict):
    if current_user["role"] != "helper":
        raise core.HTTPException(status_code=403, detail="Only helpers can accept jobs")

    try:
        job = await core.db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise core.HTTPException(status_code=404, detail="Job not found")
        if job["status"] != core.JobStatus.POSTED:
            raise core.HTTPException(status_code=400, detail="Job is not available")

        await core.db.jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"helper_id": current_user["_id"], "status": core.JobStatus.ACCEPTED, "updated_at": datetime.utcnow()}},
        )
        updated_job = await core.db.jobs.find_one({"_id": ObjectId(job_id)})
        return await hydrate_job(updated_job)
    except core.HTTPException:
        raise
    except Exception as exc:
        raise core.HTTPException(status_code=400, detail=str(exc))


async def update_job_status(job_id: str, current_user_id: str, status_update: core.JobUpdate):
    try:
        job = await core.db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise core.HTTPException(status_code=404, detail="Job not found")
        if str(job["user_id"]) != current_user_id and (not job.get("helper_id") or str(job["helper_id"]) != current_user_id):
            raise core.HTTPException(status_code=403, detail="Not authorized")
        if not status_update.status:
            raise core.HTTPException(status_code=400, detail="Status is required")
        if status_update.status not in ALLOWED_STATUS_TRANSITIONS.get(job["status"], set()):
            raise core.HTTPException(status_code=400, detail="Invalid status transition")

        update_data = {"updated_at": datetime.utcnow()}
        update_data["status"] = status_update.status

        await core.db.jobs.update_one({"_id": ObjectId(job_id)}, {"$set": update_data})
        updated_job = await core.db.jobs.find_one({"_id": ObjectId(job_id)})
        return await hydrate_job(updated_job)
    except core.HTTPException:
        raise
    except Exception as exc:
        raise core.HTTPException(status_code=400, detail=str(exc))
