from datetime import datetime

from bson import ObjectId

import core
from services.ai import ensure_default_communities


async def list_communities(current_user: dict):
    await ensure_default_communities()
    communities = await core.db.communities.find({}).to_list(100)
    memberships = await core.db.community_memberships.find({"user_id": ObjectId(current_user["_id"])}).to_list(100)
    joined_ids = {str(membership["community_id"]) for membership in memberships}

    result = []
    for community in communities:
        serialized = core.serialize_community(community)
        serialized["joined"] = serialized["_id"] in joined_ids
        result.append(serialized)
    return result


async def join_community(community_id: str, current_user: dict):
    community = await core.db.communities.find_one({"_id": ObjectId(community_id)})
    if not community:
        raise core.HTTPException(status_code=404, detail="Community not found")

    existing = await core.db.community_memberships.find_one({
        "community_id": ObjectId(community_id),
        "user_id": ObjectId(current_user["_id"]),
    })
    if existing:
        return {"message": "Already joined", "community": core.serialize_community(community)}

    await core.db.community_memberships.insert_one({
        "community_id": ObjectId(community_id),
        "user_id": ObjectId(current_user["_id"]),
        "created_at": datetime.utcnow(),
    })
    await core.db.communities.update_one(
        {"_id": ObjectId(community_id)},
        {"$set": {"members": int(community.get("members", 0)) + 1, "updated_at": datetime.utcnow()}},
    )
    return {"message": "Community joined", "community": core.serialize_community({**community, "members": int(community.get("members", 0)) + 1})}


async def create_referral(current_user: dict, referral_data: core.ReferralCreate):
    community_oid = ObjectId(referral_data.community_id) if referral_data.community_id else None
    referral = {
        "user_id": ObjectId(current_user["_id"]),
        "invitee_contact": referral_data.invitee_contact,
        "community_id": community_oid,
        "message": referral_data.message,
        "status": "sent",
        "reward_points": 25,
        "created_at": datetime.utcnow(),
    }
    result = await core.db.referrals.insert_one(referral)
    referral["_id"] = result.inserted_id

    await core.db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {
            "invite_count": int(current_user.get("invite_count", 0)) + 1,
            "community_reward_points": int(current_user.get("community_reward_points", 0)) + 25,
            "updated_at": datetime.utcnow(),
        }},
    )
    return {"message": "Referral tracked", "referral": core.serialize_referral(referral)}
