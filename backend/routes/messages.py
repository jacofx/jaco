from fastapi import Depends

import core
from services.messages import (
    get_conversations as get_conversations_service,
    get_job_messages as get_job_messages_service,
    send_message as send_message_service,
)


@core.api_router.get("/messages/jobs/{job_id}")
async def get_job_messages(job_id: str, current_user: dict = Depends(core.get_current_user)):
    return await get_job_messages_service(job_id, current_user["_id"])


@core.api_router.post("/messages")
async def send_message(message_data: core.MessageCreate, current_user: dict = Depends(core.get_current_user)):
    return await send_message_service(
        current_user["_id"],
        message_data.job_id,
        message_data.receiver_id,
        message_data.message,
    )


@core.api_router.get("/messages/conversations")
async def get_conversations(current_user: dict = Depends(core.get_current_user)):
    return await get_conversations_service(current_user["_id"])
