from datetime import datetime
from typing import Optional

from bson import ObjectId

import core


async def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    job_id: Optional[ObjectId] = None,
    data: Optional[dict] = None,
):
    notification_dict = {
        "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "job_id": job_id,
        "data": data or {},
        "read": False,
        "created_at": datetime.utcnow(),
    }

    result = await core.db.notifications.insert_one(notification_dict)
    notification_dict["_id"] = result.inserted_id
    serialized = core.serialize_notification(notification_dict)
    await core.sio.emit("new_notification", serialized, room=serialized["user_id"])
    return serialized


async def mark_notification_read(notification_id: str, current_user_id: str, read: bool):
    try:
        notification = await core.db.notifications.find_one({"_id": ObjectId(notification_id)})
    except Exception:
        raise core.HTTPException(status_code=400, detail="Invalid notification ID")

    if not notification:
        raise core.HTTPException(status_code=404, detail="Notification not found")
    if str(notification["user_id"]) != current_user_id:
        raise core.HTTPException(status_code=403, detail="Not authorized")

    await core.db.notifications.update_one({"_id": notification["_id"]}, {"$set": {"read": read}})
    updated_notification = await core.db.notifications.find_one({"_id": notification["_id"]})
    return core.serialize_notification(updated_notification)
