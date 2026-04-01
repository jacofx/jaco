from datetime import datetime

from fastapi import Depends, HTTPException

import core


@core.api_router.post("/auth/send-email-code")
async def send_email_code(request: core.EmailVerificationRequest):
    normalized_email = str(request.email).strip().lower()

    existing_user = await core.db.users.find_one({"email": normalized_email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    code = core.generate_email_verification_code()
    await core.store_signup_verification_code(normalized_email, code)

    try:
        await core.send_signup_verification_email(normalized_email, code)
    except Exception as exc:
        await core.get_email_verification_codes_collection().delete_one(
            {"email": normalized_email, "purpose": "signup", "used": False}
        )
        raise HTTPException(status_code=500, detail=f"Failed to send verification email: {exc}")

    return {
        "message": "Verification code sent",
        "expires_in_seconds": core.EMAIL_VERIFICATION_CODE_TTL_MINUTES * 60,
    }


@core.api_router.post("/auth/register")
async def register(user_data: core.UserRegister):
    if not user_data.email and not user_data.phone:
        raise HTTPException(status_code=400, detail="Email or phone required")

    normalized_email = str(user_data.email).strip().lower() if user_data.email else None

    if normalized_email:
        existing_user = await core.db.users.find_one({"email": normalized_email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

    if user_data.phone:
        existing_user = await core.db.users.find_one({"phone": user_data.phone})
        if existing_user:
            raise HTTPException(status_code=400, detail="Phone already registered")

    if normalized_email:
        if not user_data.email_verification_code:
            raise HTTPException(status_code=400, detail="Email verification code required")
        await core.consume_signup_verification_code(normalized_email, user_data.email_verification_code)

    user_dict = {
        "email": normalized_email,
        "phone": user_data.phone,
        "password_hash": core.hash_password(user_data.password),
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
        "updated_at": datetime.utcnow(),
    }

    result = await core.db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    access_token = core.create_access_token(data={"sub": user_id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user_id,
        "name": user_data.name,
        "role": user_data.role,
    }


@core.api_router.post("/auth/login")
async def login(credentials: core.UserLogin):
    query = {}
    if credentials.email:
        query["email"] = credentials.email.strip().lower()
    elif credentials.phone:
        query["phone"] = credentials.phone
    else:
        raise HTTPException(status_code=400, detail="Email or phone required")

    user = await core.db.users.find_one(query)
    if not user or not core.verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id = str(user["_id"])
    access_token = core.create_access_token(data={"sub": user_id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user_id,
        "name": user["name"],
        "role": user["role"],
    }


@core.api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(core.get_current_user)):
    return current_user
