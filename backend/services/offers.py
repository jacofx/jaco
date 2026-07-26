from datetime import datetime

from bson import ObjectId

import core
from services.notifications import create_notification


async def create_offer(job_id: str, current_user: dict, offer_data: core.JobOfferCreate):
    if current_user["role"] != "helper":
        raise core.HTTPException(status_code=403, detail="Only helpers can create offers")

    job = await core.db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise core.HTTPException(status_code=404, detail="Job not found")
    if job["status"] != core.JobStatus.POSTED:
        raise core.HTTPException(status_code=400, detail="Job is not accepting offers")
    if str(job["user_id"]) == current_user["_id"]:
        raise core.HTTPException(status_code=400, detail="Cannot offer on your own job")

    offer = {
        "job_id": ObjectId(job_id),
        "user_id": ObjectId(str(job["user_id"])),
        "provider_id": ObjectId(current_user["_id"]),
        "provider_name": current_user.get("name"),
        "provider_type": offer_data.provider_type or "expert",
        "quote": offer_data.quote,
        "currency": "NGN",
        "message": offer_data.message,
        "timeline": offer_data.timeline,
        "availability": offer_data.availability,
        "status": core.OfferStatus.PENDING,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await core.db.job_offers.insert_one(offer)
    offer["_id"] = result.inserted_id

    await create_notification(
        str(job["user_id"]),
        "job_offer_created",
        "New offer received",
        f"{current_user.get('name', 'A helper')} sent a quote for {job['title']}.",
        job_id=ObjectId(job_id),
        data={"offer_id": str(result.inserted_id), "quote": offer_data.quote},
    )
    return core.serialize_offer(offer)


async def list_job_offers(job_id: str, current_user: dict):
    job = await core.db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise core.HTTPException(status_code=404, detail="Job not found")
    if str(job["user_id"]) != current_user["_id"] and str(job.get("helper_id")) != current_user["_id"]:
        raise core.HTTPException(status_code=403, detail="Not authorized")

    offers = await core.db.job_offers.find({"job_id": ObjectId(job_id)}).sort("created_at", -1).to_list(100)
    return [core.serialize_offer(offer) for offer in offers]


async def accept_offer(offer_id: str, current_user: dict):
    offer = await core.db.job_offers.find_one({"_id": ObjectId(offer_id)})
    if not offer:
        raise core.HTTPException(status_code=404, detail="Offer not found")
    if str(offer["user_id"]) != current_user["_id"]:
        raise core.HTTPException(status_code=403, detail="Only the job poster can accept this offer")
    if offer["status"] != core.OfferStatus.PENDING:
        raise core.HTTPException(status_code=400, detail="Offer is not pending")

    job = await core.db.jobs.find_one({"_id": offer["job_id"]})
    if not job:
        raise core.HTTPException(status_code=404, detail="Job not found")
    if job["status"] != core.JobStatus.POSTED:
        raise core.HTTPException(status_code=400, detail="Job is not available")

    now = datetime.utcnow()
    commission = round(float(offer["quote"]) * 0.10, 2)
    booking = {
        "job_id": offer["job_id"],
        "offer_id": offer["_id"],
        "user_id": offer["user_id"],
        "provider_id": offer["provider_id"],
        "amount": offer["quote"],
        "currency": offer.get("currency", "NGN"),
        "commission": commission,
        "provider_payout": round(float(offer["quote"]) - commission, 2),
        "status": core.BookingStatus.PENDING_PAYMENT,
        "created_at": now,
        "updated_at": now,
    }
    booking_result = await core.db.bookings.insert_one(booking)
    booking["_id"] = booking_result.inserted_id

    await core.db.job_offers.update_one({"_id": offer["_id"]}, {"$set": {"status": core.OfferStatus.ACCEPTED, "updated_at": now}})
    await core.db.job_offers.update_one(
        {"job_id": offer["job_id"], "status": core.OfferStatus.PENDING},
        {"$set": {"status": core.OfferStatus.DECLINED, "updated_at": now}},
    )
    await core.db.jobs.update_one(
        {"_id": offer["job_id"]},
        {"$set": {
            "helper_id": str(offer["provider_id"]),
            "status": core.JobStatus.ACCEPTED,
            "accepted_offer_id": str(offer["_id"]),
            "booking_id": str(booking_result.inserted_id),
            "updated_at": now,
        }},
    )

    await create_notification(
        str(offer["provider_id"]),
        "job_offer_accepted",
        "Offer accepted",
        f"Your quote for {job['title']} was accepted.",
        job_id=offer["job_id"],
        data={"offer_id": str(offer["_id"]), "booking_id": str(booking_result.inserted_id)},
    )
    return {"offer": core.serialize_offer({**offer, "status": core.OfferStatus.ACCEPTED}), "booking": core.serialize_booking(booking)}
