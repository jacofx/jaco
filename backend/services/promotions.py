from datetime import datetime, timedelta

import core
from services.notifications import create_notification


def normalize_job_promotion(job_dict: dict) -> dict:
    existing_expires_at = job_dict.get("promotion_expires_at")
    raw_promotion = job_dict.get("promotion") or {}
    raw_package = (
        job_dict.get("ad_package")
        or raw_promotion.get("id")
        or raw_promotion.get("package")
        or raw_promotion.get("name")
    )

    if raw_package in core.PROMOTION_PRESETS:
        preset = core.PROMOTION_PRESETS[raw_package].copy()
    elif job_dict.get("is_featured") or job_dict.get("is_urgent") or (job_dict.get("priority_level") or 0) >= 2:
        preset = core.PROMOTION_PRESETS["top"].copy()
    elif (job_dict.get("priority_level") or 0) >= 1:
        preset = core.PROMOTION_PRESETS["boost"].copy()
    else:
        preset = core.PROMOTION_PRESETS["free"].copy()

    promotion_days = job_dict.get("promotion_days")
    priority_level = job_dict.get("priority_level")
    is_featured = job_dict.get("is_featured")
    is_urgent = job_dict.get("is_urgent")

    preset["duration_days"] = promotion_days if promotion_days is not None else preset["duration_days"]
    preset["priority_level"] = priority_level if priority_level is not None else preset["priority_level"]
    preset["featured"] = is_featured if is_featured is not None else preset["featured"]
    preset["urgent"] = is_urgent if is_urgent is not None else preset["urgent"]

    job_dict["ad_package"] = preset["id"]
    job_dict["promotion"] = preset
    job_dict["promotion_days"] = preset["duration_days"]
    job_dict["priority_level"] = preset["priority_level"]
    job_dict["is_featured"] = preset["featured"]
    job_dict["is_urgent"] = preset["urgent"]

    if preset["duration_days"] > 0:
        job_dict["promotion_expires_at"] = existing_expires_at or (datetime.utcnow() + timedelta(days=preset["duration_days"]))
    else:
        job_dict["promotion_expires_at"] = None

    return job_dict


def is_job_promotion_expired(job: dict) -> bool:
    if not job:
        return False
    if (job.get("ad_package") or "free") == "free":
        return False
    expires_at = job.get("promotion_expires_at")
    return bool(expires_at and expires_at <= datetime.utcnow())


async def expire_job_promotion(job: dict) -> dict:
    if not is_job_promotion_expired(job):
        return job

    free_promotion = core.PROMOTION_PRESETS["free"].copy()
    update_data = {
        "ad_package": free_promotion["id"],
        "promotion": free_promotion,
        "promotion_days": free_promotion["duration_days"],
        "priority_level": free_promotion["priority_level"],
        "is_featured": free_promotion["featured"],
        "is_urgent": free_promotion["urgent"],
        "promotion_expires_at": None,
        "updated_at": datetime.utcnow(),
    }

    await core.db.jobs.update_one({"_id": job["_id"]}, {"$set": update_data})

    existing_expiry_notification = await core.db.notifications.find_one({
        "user_id": job["user_id"],
        "type": "promotion_expired",
        "job_id": job["_id"],
    })
    if not existing_expiry_notification:
        await create_notification(
            str(job["user_id"]),
            "promotion_expired",
            "Promotion expired",
            f"{job['title']} is back to a free listing.",
            job_id=job["_id"],
            data={"ad_package": job.get("ad_package")},
        )

    job.update(update_data)
    return job


async def hydrate_job(job: dict) -> dict:
    return core.serialize_job(await expire_job_promotion(job))
