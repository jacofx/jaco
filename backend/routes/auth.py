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
    if not user or not user.get("password_hash") or not core.verify_password(credentials.password, user["password_hash"]):
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


@core.api_router.post("/auth/google")
async def google_login(credentials: core.GoogleLogin):
    if not credentials.id_token and not credentials.access_token:
        raise HTTPException(status_code=400, detail="Google token is required")

    token_payload = (
        await verify_google_id_token(credentials.id_token)
        if credentials.id_token
        else await verify_google_access_token(credentials.access_token)
    )
    email = token_payload.get("email", "").strip().lower()
    google_sub = token_payload.get("sub")
    name = token_payload.get("name") or email.split("@")[0]
    profile_photo = token_payload.get("picture")

    if not email or not google_sub:
        raise HTTPException(status_code=400, detail="Google account did not provide required profile data")

    user = await core.db.users.find_one({"$or": [{"google_sub": google_sub}, {"email": email}]})
    now = datetime.utcnow()

    if user:
        await core.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "google_sub": google_sub,
                "auth_provider": "google",
                "email_verified": True,
                "profile_photo": user.get("profile_photo") or profile_photo,
                "updated_at": now,
            }},
        )
        user = await core.db.users.find_one({"_id": user["_id"]})
    else:
        user_dict = {
            "email": email,
            "phone": None,
            "password_hash": None,
            "google_sub": google_sub,
            "auth_provider": "google",
            "email_verified": True,
            "name": name,
            "role": credentials.role or core.UserRole.NEED_HELP,
            "skills": credentials.skills if credentials.role == core.UserRole.HELPER else [],
            "profile_photo": profile_photo,
            "location": None,
            "rating": 0,
            "completed_jobs_count": 0,
            "total_rating": 0,
            "rating_count": 0,
            "trust_score": 70,
            "created_at": now,
            "updated_at": now,
        }
        result = await core.db.users.insert_one(user_dict)
        user = {**user_dict, "_id": result.inserted_id}

    user_id = str(user["_id"])
    access_token = core.create_access_token(data={"sub": user_id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user_id,
        "name": user["name"],
        "email": user.get("email"),
        "role": user["role"],
        "profile_photo": user.get("profile_photo"),
        "skills": user.get("skills", []),
    }


async def verify_google_id_token(id_token: str):
    try:
        async with core.httpx.AsyncClient(timeout=core.SMTP_TIMEOUT_SECONDS) as client:
            response = await client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": id_token})
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to verify Google token: {exc}")

    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    payload = response.json()
    allowed_client_ids = core.get_google_client_ids()
    if allowed_client_ids and payload.get("aud") not in allowed_client_ids:
        raise HTTPException(status_code=401, detail="Google token audience is not allowed")
    if payload.get("email_verified") not in {True, "true", "True"}:
        raise HTTPException(status_code=401, detail="Google email is not verified")

    return payload


async def verify_google_access_token(access_token: str):
    try:
        async with core.httpx.AsyncClient(timeout=core.SMTP_TIMEOUT_SECONDS) as client:
            token_response = await client.get(
                "https://www.googleapis.com/oauth2/v3/tokeninfo",
                params={"access_token": access_token},
            )
            userinfo_response = await client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to verify Google access token: {exc}")

    if token_response.status_code >= 400 or userinfo_response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Invalid Google access token")

    token_payload = token_response.json()
    allowed_client_ids = core.get_google_client_ids()
    token_audience = token_payload.get("aud") or token_payload.get("azp")
    if allowed_client_ids and token_audience not in allowed_client_ids:
        raise HTTPException(status_code=401, detail="Google token audience is not allowed")

    user_payload = userinfo_response.json()
    if user_payload.get("email_verified") not in {True, "true", "True"}:
        raise HTTPException(status_code=401, detail="Google email is not verified")

    return {
        "sub": user_payload.get("sub"),
        "email": user_payload.get("email"),
        "email_verified": user_payload.get("email_verified"),
        "name": user_payload.get("name"),
        "picture": user_payload.get("picture"),
        "aud": token_audience,
    }


@core.api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(core.get_current_user)):
    return current_user
