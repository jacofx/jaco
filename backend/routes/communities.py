from fastapi import Depends

import core
from services.communities import (
    create_referral as create_referral_service,
    join_community as join_community_service,
    list_communities as list_communities_service,
)


@core.api_router.get("/communities")
async def list_communities(current_user: dict = Depends(core.get_current_user)):
    return await list_communities_service(current_user)


@core.api_router.post("/communities/{community_id}/join")
async def join_community(community_id: str, current_user: dict = Depends(core.get_current_user)):
    return await join_community_service(community_id, current_user)


@core.api_router.post("/referrals")
async def create_referral(referral_data: core.ReferralCreate, current_user: dict = Depends(core.get_current_user)):
    return await create_referral_service(current_user, referral_data)
