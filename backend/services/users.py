from datetime import datetime
from typing import Optional

from bson import ObjectId

import core


async def get_user(user_id: str):
    try:
        user = await core.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise core.HTTPException(status_code=404, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except core.HTTPException:
        raise
    except Exception as exc:
        raise core.HTTPException(status_code=400, detail=str(exc))


async def update_user(current_user_id: str, user_update: core.UserUpdate):
    update_data = {key: value for key, value in user_update.dict().items() if value is not None}
    if update_data.get("location") and hasattr(update_data["location"], "dict"):
        update_data["location"] = update_data["location"].dict()
    update_data["updated_at"] = datetime.utcnow()

    await core.db.users.update_one({"_id": ObjectId(current_user_id)}, {"$set": update_data})
    updated_user = await core.db.users.find_one({"_id": ObjectId(current_user_id)})
    updated_user["_id"] = str(updated_user["_id"])
    updated_user.pop("password_hash", None)
    return updated_user


async def get_helpers(category: Optional[str] = None, lat: Optional[float] = None, lng: Optional[float] = None):
    query = {"role": "helper"}
    if category:
        query["skills"] = category

    helpers = await core.db.users.find(query, {"password_hash": 0}).to_list(100)
    result = []
    for helper in helpers:
        helper["_id"] = str(helper["_id"])
        if lat and lng and helper.get("location"):
            helper["distance"] = core.calculate_distance(
                lat,
                lng,
                helper["location"]["lat"],
                helper["location"]["lng"],
            )
        else:
            helper["distance"] = None
        result.append(helper)

    if lat and lng:
        result = sorted(result, key=lambda item: item["distance"] if item["distance"] is not None else float("inf"))
    return result
