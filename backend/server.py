import logging

from starlette.middleware.cors import CORSMiddleware

import core
import routes.ads  # noqa: F401
import routes.auth  # noqa: F401
import routes.jobs  # noqa: F401
import routes.messages  # noqa: F401
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
