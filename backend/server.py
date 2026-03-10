from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import socketio
from bson import ObjectId
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI()

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)
socket_app = socketio.ASGIApp(sio, app)

# Create API router
api_router = APIRouter(prefix="/api")

# ==================== Models ====================

class UserRole(str):
    NEED_HELP = "need_help"
    HELPER = "helper"

class JobStatus(str):
    POSTED = "posted"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class Location(BaseModel):
    lat: float
    lng: float
    address: str

class UserRegister(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str
    name: str
    role: str  # "need_help" or "helper"
    skills: Optional[List[str]] = []

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

class JobUpdate(BaseModel):
    status: Optional[str] = None
    helper_id: Optional[str] = None

class MessageCreate(BaseModel):
    job_id: str
    receiver_id: str
    message: str

class ReviewCreate(BaseModel):
    job_id: str
    helper_id: str
    rating: int  # 1-5
    comment: str

# ==================== Helper Functions ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
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
    return user

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in kilometers using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return round(distance, 2)

# ==================== Authentication Routes ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    if user_data.email:
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    if user_data.phone:
        existing_user = await db.users.find_one({"phone": user_data.phone})
        if existing_user:
            raise HTTPException(status_code=400, detail="Phone already registered")
    
    # Create new user
    user_dict = {
        "email": user_data.email,
        "phone": user_data.phone,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "skills": user_data.skills if user_data.role == "helper" else [],
        "profile_photo": None,
        "location": None,
        "rating": 0,
        "completed_jobs_count": 0,
        "total_rating": 0,
        "rating_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user_id,
        "name": user_data.name,
        "role": user_data.role
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Find user
    query = {}
    if credentials.email:
        query["email"] = credentials.email
    elif credentials.phone:
        query["phone"] = credentials.phone
    else:
        raise HTTPException(status_code=400, detail="Email or phone required")
    
    user = await db.users.find_one(query)
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create access token
    user_id = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user_id,
        "name": user["name"],
        "role": user["role"]
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ==================== User Routes ====================

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user["_id"] = str(user["_id"])
        # Don't return password hash
        user.pop("password_hash", None)
        return user
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/users/me")
async def update_user(user_update: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    
    # Location is already a dict when parsed by FastAPI, no need to call .dict()
    if update_data.get("location") and hasattr(update_data["location"], "dict"):
        update_data["location"] = update_data["location"].dict()
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    updated_user["_id"] = str(updated_user["_id"])
    updated_user.pop("password_hash", None)
    
    return updated_user

@api_router.get("/helpers")
async def get_helpers(
    category: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"role": "helper"}
    if category:
        query["skills"] = category
    
    helpers = await db.users.find(query).to_list(100)
    
    # Calculate distance if location provided
    result = []
    for helper in helpers:
        helper["_id"] = str(helper["_id"])
        helper.pop("password_hash", None)
        
        # Calculate distance
        if lat and lng and helper.get("location"):
            helper["distance"] = calculate_distance(
                lat, lng,
                helper["location"]["lat"],
                helper["location"]["lng"]
            )
        else:
            helper["distance"] = None
        
        result.append(helper)
    
    # Sort by distance if available
    if lat and lng:
        result = sorted(result, key=lambda x: x["distance"] if x["distance"] is not None else float('inf'))
    
    return result

# ==================== Job Routes ====================

@api_router.post("/jobs")
async def create_job(job_data: JobCreate, current_user: dict = Depends(get_current_user)):
    job_dict = job_data.dict()
    job_dict["user_id"] = current_user["_id"]
    job_dict["helper_id"] = None
    job_dict["status"] = JobStatus.POSTED
    job_dict["created_at"] = datetime.utcnow()
    job_dict["updated_at"] = datetime.utcnow()
    
    result = await db.jobs.insert_one(job_dict)
    job_dict["_id"] = str(result.inserted_id)
    job_dict["user_id"] = str(job_dict["user_id"])
    
    return job_dict

@api_router.get("/jobs")
async def get_jobs(
    status: Optional[str] = None,
    category: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    
    jobs = await db.jobs.find(query).sort("created_at", -1).to_list(100)
    
    result = []
    for job in jobs:
        job["_id"] = str(job["_id"])
        job["user_id"] = str(job["user_id"])
        if job.get("helper_id"):
            job["helper_id"] = str(job["helper_id"])
        
        # Get user info
        user = await db.users.find_one({"_id": ObjectId(job["user_id"])})
        if user:
            job["user_name"] = user["name"]
        
        # Calculate distance
        if lat and lng and job.get("location"):
            job["distance"] = calculate_distance(
                lat, lng,
                job["location"]["lat"],
                job["location"]["lng"]
            )
        else:
            job["distance"] = None
        
        result.append(job)
    
    # Sort by distance if available
    if lat and lng:
        result = sorted(result, key=lambda x: x["distance"] if x["distance"] is not None else float('inf'))
    
    return result

@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    try:
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job["_id"] = str(job["_id"])
        job["user_id"] = str(job["user_id"])
        if job.get("helper_id"):
            job["helper_id"] = str(job["helper_id"])
        
        return job
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/jobs/my/posted")
async def get_my_posted_jobs(current_user: dict = Depends(get_current_user)):
    jobs = await db.jobs.find({"user_id": current_user["_id"]}).sort("created_at", -1).to_list(100)
    
    result = []
    for job in jobs:
        job["_id"] = str(job["_id"])
        job["user_id"] = str(job["user_id"])
        if job.get("helper_id"):
            job["helper_id"] = str(job["helper_id"])
            # Get helper info
            helper = await db.users.find_one({"_id": ObjectId(job["helper_id"])})
            if helper:
                job["helper_name"] = helper["name"]
                job["helper_photo"] = helper.get("profile_photo")
        
        result.append(job)
    
    return result

@api_router.get("/jobs/my/accepted")
async def get_my_accepted_jobs(current_user: dict = Depends(get_current_user)):
    jobs = await db.jobs.find({"helper_id": current_user["_id"]}).sort("created_at", -1).to_list(100)
    
    result = []
    for job in jobs:
        job["_id"] = str(job["_id"])
        job["user_id"] = str(job["user_id"])
        job["helper_id"] = str(job["helper_id"])
        
        # Get user info
        user = await db.users.find_one({"_id": ObjectId(job["user_id"])})
        if user:
            job["user_name"] = user["name"]
            job["user_photo"] = user.get("profile_photo")
        
        result.append(job)
    
    return result

@api_router.put("/jobs/{job_id}/accept")
async def accept_job(job_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "helper":
        raise HTTPException(status_code=403, detail="Only helpers can accept jobs")
    
    try:
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job["status"] != JobStatus.POSTED:
            raise HTTPException(status_code=400, detail="Job is not available")
        
        await db.jobs.update_one(
            {"_id": ObjectId(job_id)},
            {
                "$set": {
                    "helper_id": current_user["_id"],
                    "status": JobStatus.ACCEPTED,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        updated_job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        updated_job["_id"] = str(updated_job["_id"])
        updated_job["user_id"] = str(updated_job["user_id"])
        updated_job["helper_id"] = str(updated_job["helper_id"])
        
        return updated_job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/jobs/{job_id}/status")
async def update_job_status(job_id: str, status_update: JobUpdate, current_user: dict = Depends(get_current_user)):
    try:
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check authorization
        if str(job["user_id"]) != current_user["_id"] and (not job.get("helper_id") or str(job["helper_id"]) != current_user["_id"]):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_data = {"updated_at": datetime.utcnow()}
        if status_update.status:
            update_data["status"] = status_update.status
        
        await db.jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": update_data}
        )
        
        updated_job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        updated_job["_id"] = str(updated_job["_id"])
        updated_job["user_id"] = str(updated_job["user_id"])
        if updated_job.get("helper_id"):
            updated_job["helper_id"] = str(updated_job["helper_id"])
        
        return updated_job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== Message Routes ====================

@api_router.get("/messages/jobs/{job_id}")
async def get_job_messages(job_id: str, current_user: dict = Depends(get_current_user)):
    try:
        # Verify user is part of the job
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if str(job["user_id"]) != current_user["_id"] and (not job.get("helper_id") or str(job["helper_id"]) != current_user["_id"]):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        messages = await db.messages.find({"job_id": job_id}).sort("timestamp", 1).to_list(500)
        
        for msg in messages:
            msg["_id"] = str(msg["_id"])
        
        return messages
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/messages")
async def send_message(message_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    message_dict = {
        "job_id": message_data.job_id,
        "sender_id": current_user["_id"],
        "receiver_id": message_data.receiver_id,
        "message": message_data.message,
        "timestamp": datetime.utcnow(),
        "read": False
    }
    
    result = await db.messages.insert_one(message_dict)
    message_dict["_id"] = str(result.inserted_id)
    
    # Emit socket event
    await sio.emit('new_message', message_dict, room=message_data.receiver_id)
    
    return message_dict

@api_router.get("/messages/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    # Get all jobs where user is involved
    jobs = await db.jobs.find({
        "$or": [
            {"user_id": current_user["_id"]},
            {"helper_id": current_user["_id"]}
        ]
    }).to_list(100)
    
    conversations = []
    for job in jobs:
        job_id = str(job["_id"])
        
        # Get last message
        last_message = await db.messages.find_one(
            {"job_id": job_id},
            sort=[("timestamp", -1)]
        )
        
        # Get unread count
        unread_count = await db.messages.count_documents({
            "job_id": job_id,
            "receiver_id": current_user["_id"],
            "read": False
        })
        
        # Get other user info
        other_user_id = str(job["helper_id"]) if str(job["user_id"]) == current_user["_id"] else str(job["user_id"])
        if other_user_id and other_user_id != "None":
            other_user = await db.users.find_one({"_id": ObjectId(other_user_id)})
            if other_user:
                conversations.append({
                    "job_id": job_id,
                    "job_title": job["title"],
                    "other_user": {
                        "id": str(other_user["_id"]),
                        "name": other_user["name"],
                        "profile_photo": other_user.get("profile_photo")
                    },
                    "last_message": last_message["message"] if last_message else None,
                    "last_message_time": last_message["timestamp"] if last_message else None,
                    "unread_count": unread_count
                })
    
    # Sort by last message time
    conversations.sort(key=lambda x: x["last_message_time"] if x["last_message_time"] else datetime.min, reverse=True)
    
    return conversations

# ==================== Review Routes ====================

@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    # Check if job exists and is completed
    job = await db.jobs.find_one({"_id": ObjectId(review_data.job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job must be completed to leave a review")
    
    if str(job["user_id"]) != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Only job poster can leave a review")
    
    # Check if review already exists
    existing_review = await db.reviews.find_one({"job_id": review_data.job_id})
    if existing_review:
        raise HTTPException(status_code=400, detail="Review already exists for this job")
    
    # Create review
    review_dict = {
        "job_id": review_data.job_id,
        "helper_id": review_data.helper_id,
        "user_id": current_user["_id"],
        "rating": review_data.rating,
        "comment": review_data.comment,
        "created_at": datetime.utcnow()
    }
    
    await db.reviews.insert_one(review_dict)
    
    # Update helper's rating
    helper = await db.users.find_one({"_id": ObjectId(review_data.helper_id)})
    if helper:
        new_total_rating = helper.get("total_rating", 0) + review_data.rating
        new_rating_count = helper.get("rating_count", 0) + 1
        new_rating = new_total_rating / new_rating_count
        new_completed_jobs = helper.get("completed_jobs_count", 0) + 1
        
        await db.users.update_one(
            {"_id": ObjectId(review_data.helper_id)},
            {
                "$set": {
                    "total_rating": new_total_rating,
                    "rating_count": new_rating_count,
                    "rating": round(new_rating, 2),
                    "completed_jobs_count": new_completed_jobs
                }
            }
        )
    
    return {"message": "Review created successfully"}

@api_router.get("/reviews/helper/{helper_id}")
async def get_helper_reviews(helper_id: str):
    try:
        reviews = await db.reviews.find({"helper_id": helper_id}).sort("created_at", -1).to_list(100)
        
        for review in reviews:
            review["_id"] = str(review["_id"])
            # Get user info
            user = await db.users.find_one({"_id": ObjectId(review["user_id"])})
            if user:
                review["user_name"] = user["name"]
        
        return reviews
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== Socket.IO Events ====================

@sio.event
async def connect(sid, environ):
    logging.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    """Join a room (typically user_id for direct messages)"""
    room = data.get('room')
    sio.enter_room(sid, room)
    logging.info(f"Client {sid} joined room {room}")

@sio.event
async def leave_room(sid, data):
    """Leave a room"""
    room = data.get('room')
    sio.leave_room(sid, room)
    logging.info(f"Client {sid} left room {room}")

@sio.event
async def send_message(sid, data):
    """Handle real-time message sending"""
    receiver_id = data.get('receiver_id')
    await sio.emit('new_message', data, room=receiver_id)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
