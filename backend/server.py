import logging

from fastapi import HTTPException
from fastapi.responses import RedirectResponse
from starlette.middleware.cors import CORSMiddleware

import core
import routes.ads  # noqa: F401
import routes.ai  # noqa: F401
import routes.auth  # noqa: F401
import routes.bookings  # noqa: F401
import routes.communities  # noqa: F401
import routes.jobs  # noqa: F401
import routes.messages  # noqa: F401
import routes.offers  # noqa: F401
import routes.reviews  # noqa: F401
import routes.users  # noqa: F401
import socket_events  # noqa: F401

app = core.app
api_router = core.api_router
socket_app = core.socket_app
sio = core.sio

db = core.db
stripe = core.stripe
PAYMENTS_MODE = core.PAYMENTS_MODE
get_current_user = core.get_current_user
PROMOTION_PRESETS = core.PROMOTION_PRESETS

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs", status_code=307)


async def _health_payload():
    try:
        await core.ping_database()
        db_status = "ok"
        db_error = None
    except Exception as exc:
        db_status = "error"
        db_error = str(exc)

    payload = {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "payments_mode": PAYMENTS_MODE,
    }

    if db_error:
        payload["database_error"] = db_error

    return payload


@app.get("/health")
async def health_check():
    payload = await _health_payload()
    if payload["status"] != "ok":
        raise HTTPException(status_code=503, detail=payload)
    return payload


@app.get("/api/health")
async def api_health_check():
    payload = await _health_payload()
    if payload["status"] != "ok":
        raise HTTPException(status_code=503, detail=payload)
    return payload
