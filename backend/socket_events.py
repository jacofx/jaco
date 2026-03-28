import logging

import core


@core.sio.event
async def connect(sid, environ):
    logging.info(f"Client connected: {sid}")


@core.sio.event
async def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")


@core.sio.event
async def join_room(sid, data):
    room = data.get("room")
    core.sio.enter_room(sid, room)
    logging.info(f"Client {sid} joined room {room}")


@core.sio.event
async def leave_room(sid, data):
    room = data.get("room")
    core.sio.leave_room(sid, room)
    logging.info(f"Client {sid} left room {room}")


@core.sio.event
async def send_message(sid, data):
    receiver_id = data.get("receiver_id")
    await core.sio.emit("new_message", data, room=receiver_id)
