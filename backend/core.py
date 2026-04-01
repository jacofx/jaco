import asyncio
import hashlib
import math
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from email.message import EmailMessage
from enum import Enum
import logging
from pathlib import Path
import random
import smtplib
import ssl
from urllib.parse import parse_qs, urlparse
from typing import List, Optional

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
import socketio
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
logger = logging.getLogger(__name__)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=3000)
db = client[os.environ["DB_NAME"]]
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7
EMAIL_VERIFICATION_CODE_TTL_MINUTES = int(os.environ.get("EMAIL_VERIFICATION_CODE_TTL_MINUTES", "10"))
SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL")
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "true").lower() not in {"false", "0", "no"}
SMTP_USE_SSL = os.environ.get("SMTP_USE_SSL", "false").lower() in {"true", "1", "yes"}
SMTP_TIMEOUT_SECONDS = float(os.environ.get("SMTP_TIMEOUT_SECONDS", "10"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


async def ping_database():
    await client.admin.command("ping")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await ping_database()
        logger.info("MongoDB connection established")
    except Exception as exc:
        logger.warning(
            "MongoDB connection failed during startup; continuing in degraded mode: %s",
            exc,
        )

    yield
    client.close()


app = FastAPI(lifespan=lifespan)
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True,
)
socket_app = socketio.ASGIApp(sio, app)
api_router = APIRouter(prefix="/api")


class UserRole(str, Enum):
    NEED_HELP = "need_help"
    HELPER = "helper"


class JobStatus(str, Enum):
    POSTED = "posted"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class Location(BaseModel):
    lat: float
    lng: float
    address: str


class JobPromotion(BaseModel):
    id: str
    label: Optional[str] = None
    price: Optional[str] = None
    duration_days: Optional[int] = None
    priority_level: Optional[int] = None
    featured: Optional[bool] = None
    urgent: Optional[bool] = None


class AdCheckoutCreate(BaseModel):
    package_id: str
    redirect_uri: Optional[str] = None


class JobPaymentLink(BaseModel):
    payment_id: Optional[str] = None


class AdPaymentVerify(BaseModel):
    payment_id: str
    session_id: str


class NotificationUpdate(BaseModel):
    read: bool = True


class UserRegister(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str
    name: str
    role: UserRole
    skills: Optional[List[str]] = []
    email_verification_code: Optional[str] = None


class EmailVerificationRequest(BaseModel):
    email: EmailStr


class UserLogin(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    profile_photo: Optional[str] = None
    location: Optional[Location] = None
    skills: Optional[List[str]] = None


class JobCreate(BaseModel):
    title: str
    description: str
    budget: float
    location: Location
    category: str
    images: Optional[List[str]] = []
    ad_package: Optional[str] = "free"
    promotion: Optional[JobPromotion] = None
    promotion_days: Optional[int] = None
    priority_level: Optional[int] = None
    is_featured: Optional[bool] = None
    is_urgent: Optional[bool] = None
    payment_id: Optional[str] = None


class JobUpdate(BaseModel):
    status: Optional[JobStatus] = None
    helper_id: Optional[str] = None


class MessageCreate(BaseModel):
    job_id: str
    receiver_id: str
    message: str


class ReviewCreate(BaseModel):
    job_id: str
    helper_id: str
    rating: int = Field(ge=1, le=5)
    comment: str


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def generate_email_verification_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def hash_email_verification_code(email: str, code: str) -> str:
    normalized_email = email.strip().lower()
    normalized_code = code.strip()
    return hashlib.sha256(f"{normalized_email}:{normalized_code}:{SECRET_KEY}".encode("utf-8")).hexdigest()


def get_email_verification_codes_collection():
    return db.email_verification_codes


async def store_signup_verification_code(email: str, code: str):
    normalized_email = email.strip().lower()
    collection = get_email_verification_codes_collection()
    expires_at = datetime.utcnow() + timedelta(minutes=EMAIL_VERIFICATION_CODE_TTL_MINUTES)

    await collection.delete_one({"email": normalized_email, "purpose": "signup", "used": False})
    await collection.insert_one(
        {
            "email": normalized_email,
            "purpose": "signup",
            "code_hash": hash_email_verification_code(normalized_email, code),
            "used": False,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
        }
    )


async def consume_signup_verification_code(email: str, code: str):
    normalized_email = email.strip().lower()
    collection = get_email_verification_codes_collection()
    record = await collection.find_one(
        {"email": normalized_email, "purpose": "signup", "used": False},
        sort=[("created_at", -1)],
    )

    if not record:
        raise HTTPException(status_code=400, detail="Email verification code not requested")

    if record["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Email verification code expired")

    if record["code_hash"] != hash_email_verification_code(normalized_email, code):
        raise HTTPException(status_code=400, detail="Invalid email verification code")

    await collection.update_one(
        {"_id": record["_id"]},
        {"$set": {"used": True, "used_at": datetime.utcnow()}},
    )


def _send_email_message(message: EmailMessage):
    if not SMTP_HOST or not SMTP_FROM_EMAIL:
        raise RuntimeError("SMTP is not configured")

    if SMTP_USE_SSL:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=SMTP_TIMEOUT_SECONDS) as smtp:
            if SMTP_USERNAME:
                smtp.login(SMTP_USERNAME, SMTP_PASSWORD or "")
            smtp.send_message(message)
        return

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS) as smtp:
        if SMTP_USE_TLS:
            context = ssl.create_default_context()
            smtp.starttls(context=context)
        if SMTP_USERNAME:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD or "")
        smtp.send_message(message)


async def send_signup_verification_email(email: str, code: str):
    message = EmailMessage()
    message["Subject"] = "Your SolveConnect verification code"
    message["From"] = SMTP_FROM_EMAIL or "no-reply@solveconnect.net"
    message["To"] = email
    message.set_content(
        (
            "Your SolveConnect verification code is "
            f"{code}. It expires in {EMAIL_VERIFICATION_CODE_TTL_MINUTES} minutes."
        )
    )

    await asyncio.to_thread(_send_email_message, message)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    return await get_user_from_token(token)


async def get_user_from_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    return user


def extract_bearer_token(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    parts = value.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return value


def get_socket_token(environ: Optional[dict], auth: Optional[dict] = None) -> Optional[str]:
    if auth:
        token = auth.get("token") or auth.get("access_token") or extract_bearer_token(auth.get("Authorization"))
        if token:
            return token

    environ = environ or {}
    authorization = environ.get("HTTP_AUTHORIZATION")
    if authorization:
        token = extract_bearer_token(authorization)
        if token:
            return token

    query_string = environ.get("QUERY_STRING")
    if query_string:
        params = parse_qs(query_string)
        token = params.get("token", [None])[0] or params.get("access_token", [None])[0]
        if token:
            return token

    return None


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


PROMOTION_PRESETS = {
    "free": {
        "id": "free",
        "label": "Free listing",
        "price": "Free",
        "duration_days": 0,
        "priority_level": 0,
        "featured": False,
        "urgent": False,
    },
    "boost": {
        "id": "boost",
        "label": "Boosted ad",
        "price": "NGN 2,500",
        "duration_days": 7,
        "priority_level": 1,
        "featured": False,
        "urgent": False,
    },
    "top": {
        "id": "top",
        "label": "Top ad",
        "price": "NGN 6,000",
        "duration_days": 14,
        "priority_level": 2,
        "featured": True,
        "urgent": True,
    },
}

PACKAGE_PRICES = {
    "free": {"amount": 0, "currency": "NGN"},
    "boost": {"amount": 2500, "currency": "NGN"},
    "top": {"amount": 6000, "currency": "NGN"},
}

PAYMENTS_MODE = "stripe" if stripe.api_key else os.environ.get("PAYMENTS_MODE", "demo")


def normalize_job_promotion(job_dict: dict) -> dict:
    existing_expires_at = job_dict.get("promotion_expires_at")
    raw_promotion = job_dict.get("promotion") or {}
    raw_package = (
        job_dict.get("ad_package")
        or raw_promotion.get("id")
        or raw_promotion.get("package")
        or raw_promotion.get("name")
    )

    if raw_package in PROMOTION_PRESETS:
        preset = PROMOTION_PRESETS[raw_package].copy()
    elif job_dict.get("is_featured") or job_dict.get("is_urgent") or (job_dict.get("priority_level") or 0) >= 2:
        preset = PROMOTION_PRESETS["top"].copy()
    elif (job_dict.get("priority_level") or 0) >= 1:
        preset = PROMOTION_PRESETS["boost"].copy()
    else:
        preset = PROMOTION_PRESETS["free"].copy()

    promotion_days = job_dict.get("promotion_days")
    priority_level = job_dict.get("priority_level")
    is_featured = job_dict.get("is_featured")
    is_urgent = job_dict.get("is_urgent")

    preset["duration_days"] = promotion_days if promotion_days is not None else preset["duration_days"]
    preset["priority_level"] = priority_level if priority_level is not None else preset["priority_level"]
    preset["featured"] = is_featured if is_featured is not None else preset["featured"]
    preset["urgent"] = is_urgent if is_urgent is not None else preset["urgent"]

    job_dict["ad_package"] = preset["id"]
    job_dict["promotion"] = preset
    job_dict["promotion_days"] = preset["duration_days"]
    job_dict["priority_level"] = preset["priority_level"]
    job_dict["is_featured"] = preset["featured"]
    job_dict["is_urgent"] = preset["urgent"]

    if preset["duration_days"] > 0:
        job_dict["promotion_expires_at"] = existing_expires_at or (datetime.utcnow() + timedelta(days=preset["duration_days"]))
    else:
        job_dict["promotion_expires_at"] = None

    return job_dict


def serialize_job(job: dict) -> dict:
    job["_id"] = str(job["_id"])
    job["user_id"] = str(job["user_id"])
    if job.get("helper_id"):
        job["helper_id"] = str(job["helper_id"])
    return normalize_job_promotion(job)


def serialize_payment(payment: dict) -> dict:
    payment["_id"] = str(payment["_id"])
    payment["user_id"] = str(payment["user_id"])
    if payment.get("job_id"):
        payment["job_id"] = str(payment["job_id"])
    return payment


def serialize_notification(notification: dict) -> dict:
    notification["_id"] = str(notification["_id"])
    notification["user_id"] = str(notification["user_id"])
    if notification.get("job_id"):
        notification["job_id"] = str(notification["job_id"])
    return notification


def get_checkout_redirect_base() -> str:
    return os.environ.get("PAYMENT_REDIRECT_URI", "frontend://ads-payment")


def get_allowed_redirect_hosts() -> set:
    raw_hosts = os.environ.get("ALLOWED_PAYMENT_REDIRECT_HOSTS", "localhost,127.0.0.1")
    return {host.strip().lower() for host in raw_hosts.split(",") if host.strip()}


def validate_checkout_redirect_base(redirect_uri: Optional[str] = None) -> str:
    candidate = (redirect_uri or get_checkout_redirect_base()).strip()
    parsed = urlparse(candidate)

    if not parsed.scheme:
        raise HTTPException(status_code=400, detail="Invalid checkout redirect URI")

    if parsed.scheme == "frontend":
        return candidate.rstrip("/")

    if parsed.scheme in {"http", "https"} and parsed.hostname and parsed.hostname.lower() in get_allowed_redirect_hosts():
        return candidate.rstrip("/")

    raise HTTPException(status_code=400, detail="Unsupported checkout redirect URI")
