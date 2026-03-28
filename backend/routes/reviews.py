from fastapi import Depends

import core
from services.reviews import create_review as create_review_service, get_helper_reviews as get_helper_reviews_service


@core.api_router.post("/reviews")
async def create_review(review_data: core.ReviewCreate, current_user: dict = Depends(core.get_current_user)):
    return await create_review_service(current_user["_id"], review_data)


@core.api_router.get("/reviews/helper/{helper_id}")
async def get_helper_reviews(helper_id: str):
    return await get_helper_reviews_service(helper_id)
