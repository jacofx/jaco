from fastapi import Depends

import core
from services.bookings import (
    initialize_booking_payment as initialize_booking_payment_service,
    list_my_bookings as list_my_bookings_service,
)


@core.api_router.get("/bookings/my")
async def list_my_bookings(current_user: dict = Depends(core.get_current_user)):
    return await list_my_bookings_service(current_user)


@core.api_router.post("/bookings/{booking_id}/payment")
async def initialize_booking_payment(
    booking_id: str,
    payment_data: core.BookingPaymentCreate,
    current_user: dict = Depends(core.get_current_user),
):
    return await initialize_booking_payment_service(booking_id, current_user, payment_data)
