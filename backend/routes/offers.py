from fastapi import Depends

import core
from services.offers import (
    accept_offer as accept_offer_service,
    create_offer as create_offer_service,
    list_job_offers as list_job_offers_service,
)


@core.api_router.post("/jobs/{job_id}/offers")
async def create_offer(
    job_id: str,
    offer_data: core.JobOfferCreate,
    current_user: dict = Depends(core.get_current_user),
):
    return await create_offer_service(job_id, current_user, offer_data)


@core.api_router.get("/jobs/{job_id}/offers")
async def list_job_offers(job_id: str, current_user: dict = Depends(core.get_current_user)):
    return await list_job_offers_service(job_id, current_user)


@core.api_router.post("/offers/{offer_id}/accept")
async def accept_offer(offer_id: str, current_user: dict = Depends(core.get_current_user)):
    return await accept_offer_service(offer_id, current_user)
