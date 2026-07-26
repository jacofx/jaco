from datetime import datetime

from bson import ObjectId

import core
from services.notifications import create_notification


async def list_my_bookings(current_user: dict):
    user_id = ObjectId(current_user["_id"])
    bookings = await core.db.bookings.find({"$or": [{"user_id": user_id}, {"provider_id": user_id}]}).sort("created_at", -1).to_list(100)
    return [core.serialize_booking(booking) for booking in bookings]


async def initialize_booking_payment(booking_id: str, current_user: dict, payment_data: core.BookingPaymentCreate):
    booking = await core.db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise core.HTTPException(status_code=404, detail="Booking not found")
    if str(booking["user_id"]) != current_user["_id"]:
        raise core.HTTPException(status_code=403, detail="Only the customer can pay for this booking")
    if booking["status"] != core.BookingStatus.PENDING_PAYMENT:
        raise core.HTTPException(status_code=400, detail="Booking is not pending payment")

    now = datetime.utcnow()
    payment = {
        "booking_id": booking["_id"],
        "user_id": booking["user_id"],
        "provider_id": booking["provider_id"],
        "amount": booking["amount"],
        "currency": booking.get("currency", "NGN"),
        "commission": booking["commission"],
        "provider_payout": booking["provider_payout"],
        "provider": payment_data.provider or core.PAYMENTS_MODE,
        "status": "completed",
        "created_at": now,
        "updated_at": now,
        "completed_at": now,
    }
    result = await core.db.booking_payments.insert_one(payment)
    payment["_id"] = result.inserted_id

    await core.db.bookings.update_one(
        {"_id": booking["_id"]},
        {"$set": {"status": core.BookingStatus.PAID, "payment_id": str(result.inserted_id), "updated_at": now}},
    )
    await core.db.jobs.update_one(
        {"_id": booking["job_id"]},
        {"$set": {"status": core.JobStatus.IN_PROGRESS, "updated_at": now}},
    )

    await create_notification(
        str(booking["provider_id"]),
        "booking_paid",
        "Booking paid",
        "Payment was confirmed. You can start the job.",
        job_id=booking["job_id"],
        data={"booking_id": str(booking["_id"]), "payment_id": str(result.inserted_id)},
    )

    payment["_id"] = str(payment["_id"])
    payment["booking_id"] = str(payment["booking_id"])
    payment["user_id"] = str(payment["user_id"])
    payment["provider_id"] = str(payment["provider_id"])
    return {"booking": core.serialize_booking({**booking, "status": core.BookingStatus.PAID, "payment_id": str(result.inserted_id)}), "payment": payment}
