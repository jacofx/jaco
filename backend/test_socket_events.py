import asyncio

from socketio.exceptions import ConnectionRefusedError

import core
import socket_events


def test_socket_connect_requires_auth(auth_client):
    _, _ = auth_client

    async def run_test():
        try:
            await socket_events.connect("sid-1", {}, None)
        except ConnectionRefusedError as exc:
            assert str(exc) == "Authentication required"
            return
        assert False, "connect should have been refused"

    asyncio.run(run_test())


def test_socket_connect_saves_authenticated_user_session(auth_client, monkeypatch):
    _, fake_db = auth_client
    saved = {}
    token = core.create_access_token(data={"sub": str(fake_db.buyer_id)})

    async def fake_save_session(sid, session):
        saved["sid"] = sid
        saved["session"] = session

    monkeypatch.setattr(core.sio, "save_session", fake_save_session)

    async def run_test():
        await socket_events.connect("sid-2", {}, {"access_token": token})

    asyncio.run(run_test())

    assert saved == {
        "sid": "sid-2",
        "session": {"user_id": str(fake_db.buyer_id)},
    }


def test_socket_join_room_only_allows_own_user_room(auth_client, monkeypatch):
    _, fake_db = auth_client
    joined = []

    async def fake_get_session(sid):
        return {"user_id": str(fake_db.buyer_id)}

    async def fake_enter_room(sid, room):
        joined.append((sid, room))

    monkeypatch.setattr(core.sio, "get_session", fake_get_session)
    monkeypatch.setattr(core.sio, "enter_room", fake_enter_room)

    async def run_test():
        await socket_events.join_room("sid-3", {"room": str(fake_db.helper_id)})
        await socket_events.join_room("sid-3", {"room": str(fake_db.buyer_id)})

    asyncio.run(run_test())

    assert joined == [("sid-3", str(fake_db.buyer_id))]


def test_socket_send_message_uses_job_participant_checks(client):
    _, _, active_user, monkeypatch = client
    emitted = []

    async def fake_emit(event, payload, room=None):
        emitted.append((event, payload, room))

    monkeypatch.setattr(core.sio, "emit", fake_emit)
    active_user.update({"_id": "69c000000000000000000001", "role": "helper", "name": "Intruder"})

    async def fake_get_session(sid):
        return {"user_id": "69c000000000000000000001"}

    monkeypatch.setattr(core.sio, "get_session", fake_get_session)

    async def run_test():
        try:
            await socket_events.send_message(
                "sid-4",
                {
                    "job_id": "69c000000000000000000010",
                    "receiver_id": "69c000000000000000000002",
                    "message": "bad message",
                },
            )
        except core.HTTPException as exc:
            assert exc.status_code in {400, 403, 404}
            return
        assert False, "send_message should have failed"

    asyncio.run(run_test())
    assert emitted == []
