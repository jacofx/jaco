from datetime import datetime

from bson import ObjectId

import core


async def get_job_messages(job_id: str, current_user_id: str):
    try:
        job = await core.db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise core.HTTPException(status_code=404, detail="Job not found")
        if str(job["user_id"]) != current_user_id and (not job.get("helper_id") or str(job["helper_id"]) != current_user_id):
            raise core.HTTPException(status_code=403, detail="Not authorized")

        messages = await core.db.messages.find({"job_id": job_id}).sort("timestamp", 1).to_list(500)
        for message in messages:
            message["_id"] = str(message["_id"])
        return messages
    except core.HTTPException:
        raise
    except Exception as exc:
        raise core.HTTPException(status_code=400, detail=str(exc))


async def send_message(current_user_id: str, job_id: str, receiver_id: str, message: str):
    message_dict = {
        "job_id": job_id,
        "sender_id": current_user_id,
        "receiver_id": receiver_id,
        "message": message,
        "timestamp": datetime.utcnow(),
        "read": False,
    }
    result = await core.db.messages.insert_one(message_dict)
    message_dict["_id"] = str(result.inserted_id)
    await core.sio.emit("new_message", message_dict, room=receiver_id)
    return message_dict


async def get_conversations(current_user_id: str):
    jobs = await core.db.jobs.find({
        "$or": [
            {"user_id": current_user_id},
            {"helper_id": current_user_id},
        ]
    }).to_list(100)

    conversations = []
    for job in jobs:
        job_id = str(job["_id"])
        last_message = await core.db.messages.find_one({"job_id": job_id}, sort=[("timestamp", -1)])
        unread_count = await core.db.messages.count_documents({
            "job_id": job_id,
            "receiver_id": current_user_id,
            "read": False,
        })

        other_user_id = str(job["helper_id"]) if str(job["user_id"]) == current_user_id else str(job["user_id"])
        if other_user_id and other_user_id != "None":
            other_user = await core.db.users.find_one({"_id": ObjectId(other_user_id)})
            if other_user:
                conversations.append({
                    "job_id": job_id,
                    "job_title": job["title"],
                    "other_user": {
                        "id": str(other_user["_id"]),
                        "name": other_user["name"],
                        "profile_photo": other_user.get("profile_photo"),
                    },
                    "last_message": last_message["message"] if last_message else None,
                    "last_message_time": last_message["timestamp"] if last_message else None,
                    "unread_count": unread_count,
                })

    conversations.sort(key=lambda item: item["last_message_time"] if item["last_message_time"] else datetime.min, reverse=True)
    return conversations
