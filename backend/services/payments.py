from datetime import datetime
from typing import Optional

from bson import ObjectId

import core
from services.notifications import create_notification


def get_ad_packages_payload():
    packages = []
    for package_id, promotion in core.PROMOTION_PRESETS.items():
        pricing = core.PACKAGE_PRICES[package_id]
        packages.append({
            "id": package_id,
            "name": promotion["label"],
            "price": pricing["amount"],
            "currency": pricing["currency"],
            "duration_days": promotion["duration_days"],
            "priority_level": promotion["priority_level"],
            "featured": promotion["featured"],
            "urgent": promotion["urgent"],
        })
    return {"mode": core.PAYMENTS_MODE, "packages": packages}


async def mark_payment_completed(payment: dict, payment_status: str = "paid"):
    completed_at = datetime.utcnow()
    await core.db.ad_payments.update_one(
        {"_id": payment["_id"]},
        {"$set": {
            "status": "completed",
            "completed_at": completed_at,
            "updated_at": completed_at,
            "stripe_payment_status": payment_status,
        }},
    )

    updated_payment = await core.db.ad_payments.find_one({"_id": payment["_id"]})
    if updated_payment:
        await create_notification(
            str(updated_payment["user_id"]),
            "ad_payment_completed",
            "Payment confirmed",
            f"{updated_payment['package_name']} payment was confirmed successfully.",
            data={"package_id": updated_payment.get("package_id"), "payment_id": str(updated_payment["_id"])},
        )
    return updated_payment


async def delete_payment(payment_id):
    await core.db.ad_payments.delete_one({"_id": payment_id})


async def create_ad_checkout(current_user: dict, package_id: str, redirect_uri: Optional[str] = None):
    if package_id not in core.PROMOTION_PRESETS:
        raise core.HTTPException(status_code=400, detail="Unsupported ad package")

    pricing = core.PACKAGE_PRICES[package_id]
    payment_dict = {
        "user_id": current_user["_id"],
        "package_id": package_id,
        "package_name": core.PROMOTION_PRESETS[package_id]["label"],
        "amount": pricing["amount"],
        "currency": pricing["currency"],
        "provider": core.PAYMENTS_MODE,
        "status": "completed" if pricing["amount"] == 0 else "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "completed_at": datetime.utcnow() if pricing["amount"] == 0 else None,
        "job_id": None,
    }

    result = await core.db.ad_payments.insert_one(payment_dict)
    payment_dict["_id"] = result.inserted_id
    checkout_url = None

    if pricing["amount"] > 0 and core.PAYMENTS_MODE == "stripe":
        payment_id = str(result.inserted_id)
        redirect_base = core.validate_checkout_redirect_base(redirect_uri)
        success_url = f"{redirect_base}?payment_id={payment_id}&session_id={{CHECKOUT_SESSION_ID}}&status=success"
        cancel_url = f"{redirect_base}?payment_id={payment_id}&status=cancelled"
        try:
            session = core.stripe.checkout.Session.create(
                mode="payment",
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": pricing["currency"].lower(),
                        "unit_amount": pricing["amount"] * 100,
                        "product_data": {
                            "name": core.PROMOTION_PRESETS[package_id]["label"],
                            "description": f"Promotion for {core.PROMOTION_PRESETS[package_id]['duration_days']} days",
                        },
                    },
                    "quantity": 1,
                }],
                success_url=success_url,
                cancel_url=cancel_url,
                client_reference_id=payment_id,
                metadata={
                    "payment_id": payment_id,
                    "user_id": current_user["_id"],
                    "package_id": package_id,
                },
            )
        except Exception as exc:
            await delete_payment(result.inserted_id)
            raise core.HTTPException(status_code=400, detail=str(exc))

        checkout_url = session.url
        payment_dict["checkout_session_id"] = session.id
        payment_dict["checkout_url"] = checkout_url
        await core.db.ad_payments.update_one(
            {"_id": result.inserted_id},
            {"$set": {"checkout_session_id": session.id, "checkout_url": checkout_url, "updated_at": datetime.utcnow()}},
        )
    elif pricing["amount"] > 0:
        payment_dict = await mark_payment_completed(payment_dict) or payment_dict

    return {
        "message": "Checkout created" if checkout_url else "Payment completed",
        "payment": core.serialize_payment(payment_dict),
        "promotion": core.PROMOTION_PRESETS[package_id],
        "checkout_url": checkout_url,
        "requires_redirect": bool(checkout_url),
    }


async def list_ad_purchases(current_user_id: str):
    payments = await core.db.ad_payments.find({"user_id": current_user_id}).sort("created_at", -1).to_list(100)
    return [core.serialize_payment(payment) for payment in payments]


async def list_notifications(current_user_id: str):
    notifications = await core.db.notifications.find({"user_id": ObjectId(current_user_id)}).sort("created_at", -1).to_list(100)
    return [core.serialize_notification(notification) for notification in notifications]


async def verify_ad_payment(current_user: dict, payment_id: str, session_id: str):
    try:
        payment = await core.db.ad_payments.find_one({"_id": ObjectId(payment_id)})
    except Exception:
        raise core.HTTPException(status_code=400, detail="Invalid payment reference")

    if not payment:
        raise core.HTTPException(status_code=404, detail="Payment not found")
    if str(payment["user_id"]) != current_user["_id"]:
        raise core.HTTPException(status_code=403, detail="Payment does not belong to this user")
    if payment.get("status") == "completed":
        return core.serialize_payment(payment)
    if core.PAYMENTS_MODE != "stripe":
        raise core.HTTPException(status_code=400, detail="Verification is only required for Stripe payments")
    if not core.stripe.api_key:
        raise core.HTTPException(status_code=500, detail="Stripe is not configured")

    try:
        session = core.stripe.checkout.Session.retrieve(session_id)
    except Exception as exc:
        raise core.HTTPException(status_code=400, detail=str(exc))

    if session.id != payment.get("checkout_session_id"):
        raise core.HTTPException(status_code=400, detail="Checkout session mismatch")
    if session.payment_status != "paid":
        raise core.HTTPException(status_code=400, detail="Payment not completed")

    updated_payment = await mark_payment_completed(payment, session.payment_status)
    return core.serialize_payment(updated_payment)


async def validate_job_payment(current_user: dict, job_dict: dict):
    package_id = job_dict.get("ad_package") or "free"
    if package_id == "free":
        return None

    payment_id = job_dict.get("payment_id")
    if not payment_id:
        raise core.HTTPException(status_code=400, detail="Payment is required for boosted ads")

    try:
        payment = await core.db.ad_payments.find_one({"_id": ObjectId(payment_id)})
    except Exception:
        raise core.HTTPException(status_code=400, detail="Invalid payment reference")

    if not payment:
        raise core.HTTPException(status_code=404, detail="Payment not found")
    if str(payment["user_id"]) != current_user["_id"]:
        raise core.HTTPException(status_code=403, detail="Payment does not belong to this user")
    if payment.get("status") != "completed":
        raise core.HTTPException(status_code=400, detail="Payment is not completed")
    if payment.get("package_id") != package_id:
        raise core.HTTPException(status_code=400, detail="Payment package does not match ad package")
    if payment.get("job_id"):
        raise core.HTTPException(status_code=400, detail="Payment has already been used")
    return payment
