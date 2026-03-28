from typing import Optional

from fastapi import Depends

import core
from services.users import get_helpers as get_helpers_service, get_user as get_user_service, update_user as update_user_service


@core.api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    return await get_user_service(user_id)


@core.api_router.put("/users/me")
async def update_user(user_update: core.UserUpdate, current_user: dict = Depends(core.get_current_user)):
    return await update_user_service(current_user["_id"], user_update)


@core.api_router.get("/helpers")
async def get_helpers(
    category: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    current_user: dict = Depends(core.get_current_user),
):
    return await get_helpers_service(category=category, lat=lat, lng=lng)
