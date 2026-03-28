import os

from bson import ObjectId
from fastapi import Depends, HTTPException, Request

import core
from services.notifications import mark_notification_read
from services.payments import (
    create_ad_checkout as create_ad_checkout_service,
    get_ad_packages_payload,
    list_ad_purchases,
    list_notifications,
    mark_payment_completed,
    verify_ad_payment as verify_ad_payment_service,
)


@core.api_router.get("/ads/packages")
async def get_ad_packages():
    return get_ad_packages_payload()


@core.api_router.post("/ads/checkout")
async def create_ad_checkout(checkout_data: core.AdCheckoutCreate, current_user: dict = Depends(core.get_current_user)):
    return await create_ad_checkout_service(current_user, checkout_data.package_id)


@core.api_router.get("/ads/purchases")
async def get_ad_purchases(current_user: dict = Depends(core.get_current_user)):
    return await list_ad_purchases(current_user["_id"])


@core.api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(core.get_current_user)):
    return await list_notifications(current_user["_id"])


@core.api_router.put("/notifications/{notification_id}")
async def update_notification(
    notification_id: str,
    notification_update: core.NotificationUpdate,
    current_user: dict = Depends(core.get_current_user),
):
    return await mark_notification_read(notification_id, current_user["_id"], notification_update.read)


@core.api_router.post("/ads/verify")
async def verify_ad_payment(verification_data: core.AdPaymentVerify, current_user: dict = Depends(core.get_current_user)):
    return await verify_ad_payment_service(current_user, verification_data.payment_id, verification_data.session_id)


@core.app.post("/api/ads/webhook/stripe")
async def stripe_ads_webhook(request: Request):
    if not core.stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe is not configured")

    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Stripe webhook secret is not configured")

    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")

    try:
        event = core.stripe.Webhook.construct_event(payload, signature, webhook_secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        payment_id = session.get("metadata", {}).get("payment_id") or session.get("client_reference_id")
        if payment_id:
            try:
                payment = await core.db.ad_payments.find_one({"_id": ObjectId(payment_id)})
            except Exception:
                payment = None
            if payment and payment.get("status") != "completed":
                await mark_payment_completed(payment, session.get("payment_status", "paid"))

    return {"received": True}
