import logging
from socketio.exceptions import ConnectionRefusedError

import core
from services.messages import send_message as send_message_service


@core.sio.event
async def connect(sid, environ, auth=None):
    token = core.get_socket_token(environ, auth)
    if not token:
        raise ConnectionRefusedError("Authentication required")

    try:
        user = await core.get_user_from_token(token)
    except core.HTTPException as exc:
        raise ConnectionRefusedError(exc.detail)

    await core.sio.save_session(sid, {"user_id": user["_id"]})
    logging.info(f"Client connected: {sid}")


@core.sio.event
async def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")


@core.sio.event
async def join_room(sid, data):
    session = await core.sio.get_session(sid)
    room = data.get("room")
    if not room or room != session.get("user_id"):
        return
    await core.sio.enter_room(sid, room)
    logging.info(f"Client {sid} joined room {room}")


@core.sio.event
async def leave_room(sid, data):
    session = await core.sio.get_session(sid)
    room = data.get("room")
    if not room or room != session.get("user_id"):
        return
    await core.sio.leave_room(sid, room)
    logging.info(f"Client {sid} left room {room}")


@core.sio.event
async def send_message(sid, data):
    session = await core.sio.get_session(sid)
    return await send_message_service(
        session["user_id"],
        data.get("job_id"),
        data.get("receiver_id"),
        data.get("message"),
    )
