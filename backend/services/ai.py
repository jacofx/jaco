from bson import ObjectId

import core


CATEGORY_LABELS = {
    "electrician": "Electrical & Power",
    "plumber": "Plumbing & Water",
    "generator-tech": "Generator & Power Backup",
    "tailor": "Fashion & Tailoring",
    "hairdresser": "Beauty & Grooming",
    "mechanic": "Auto & Mechanics",
    "ac-tech": "Cooling & AC",
    "phone-repair": "Device Repair",
    "caterer": "Food & Catering",
    "event-planner": "Events & Planning",
    "photographer": "Media & Photography",
    "makeup-artist": "Beauty & Makeup",
    "driver": "Transport & Logistics",
    "cleaner": "Cleaning & Facility Care",
    "bricklayer": "Building & Construction",
    "carpenter": "Furniture & Carpentry",
    "painter": "Painting & Finishing",
    "welder": "Fabrication & Welding",
    "tiler": "Tiling & Interiors",
    "tutor": "Education & Tutoring",
    "security": "Security Services",
    "laundry": "Laundry & Garment Care",
    "dj": "Entertainment",
    "dispatch": "Dispatch & Delivery",
}


async def analyze_problem(payload: dict):
    title = payload.get("title") or ""
    description = payload.get("description") or ""
    category = payload.get("category") or infer_category(f"{title} {description}")
    budget = float(payload.get("budget") or 15000)
    label = CATEGORY_LABELS.get(category, "General Problem Solving")
    text = f"{title} {description}".lower()

    urgent_words = {"urgent", "emergency", "today", "now", "broken", "leak", "fire", "unsafe", "stuck"}
    complexity_words = {"install", "build", "renovate", "multiple", "business", "company", "system", "event"}
    urgency_score = min(98, 42 + sum(14 for word in urgent_words if word in text) + (8 if budget > 50000 else 0))
    urgency = "High" if urgency_score >= 70 else "Medium" if urgency_score >= 52 else "Low"
    complexity_hits = sum(1 for word in complexity_words if word in text)
    complexity = "Complex" if complexity_hits >= 2 else "Standard" if complexity_hits == 1 else "Simple"
    low = max(5000, round((budget * 0.85) / 1000) * 1000)
    high = max(low + 5000, round((budget * 1.35) / 1000) * 1000)

    expert_ids = await get_matching_helper_ids(category)
    business_ids = await get_matching_business_ids(category)
    community_ids = await get_matching_community_ids(category)

    return {
        "category": label,
        "category_id": category,
        "urgency": urgency,
        "urgency_score": urgency_score,
        "complexity": complexity,
        "estimated_cost": {"min": low, "max": high, "currency": "NGN", "label": f"NGN {low:,.0f} - {high:,.0f}"},
        "estimated_timeline": "Same day to 24 hours" if urgency == "High" else "3 - 7 days" if complexity == "Complex" else "24 - 72 hours",
        "suggested_solutions": [
            "Confirm scope, location, and expected outcome.",
            "Request quotes from verified experts or businesses.",
            "Use chat, booking, payment, and review so the solution is traceable.",
        ],
        "recommended_expert_ids": expert_ids,
        "recommended_business_ids": business_ids,
        "recommended_community_ids": community_ids,
        "match_recommendations": {
            "experts": expert_ids,
            "businesses": business_ids,
            "communities": community_ids,
        },
    }


def infer_category(text: str) -> str:
    normalized = text.lower()
    keyword_map = {
        "plumber": {"pipe", "water", "tap", "sink", "leak", "toilet"},
        "electrician": {"light", "socket", "wire", "power", "electric", "switch"},
        "mechanic": {"car", "engine", "brake", "vehicle"},
        "tutor": {"lesson", "school", "exam", "teach", "learn"},
        "phone-repair": {"phone", "screen", "charging", "iphone", "android"},
        "cleaner": {"clean", "cleaning", "housekeeping"},
    }
    for category, words in keyword_map.items():
        if any(word in normalized for word in words):
            return category
    return "general"


async def get_matching_helper_ids(category: str):
    query = {"role": "helper"}
    if category and category != "general":
        query["skills"] = category
    helpers = await core.db.users.find(query, {"_id": 1}).to_list(5)
    return [str(helper["_id"]) for helper in helpers]


async def get_matching_business_ids(category: str):
    if not hasattr(core.db, "businesses"):
        return []
    businesses = await core.db.businesses.find({"category": category}, {"_id": 1}).to_list(5)
    return [str(business["_id"]) for business in businesses]


async def get_matching_community_ids(category: str):
    await ensure_default_communities()
    query = {"$or": [{"category": category}, {"category": "general"}]}
    communities = await core.db.communities.find(query, {"_id": 1}).to_list(5)
    return [str(community["_id"]) for community in communities]


async def ensure_default_communities():
    if not hasattr(core.db, "communities"):
        return
    if await core.db.communities.count_documents({}) > 0:
        return
    defaults = [
        {"_id": ObjectId(), "name": "Lagos Problem Solvers", "type": "City", "category": "general", "city": "Lagos", "members": 12800, "impact": "438 problems solved this month"},
        {"_id": ObjectId(), "name": "Ibadan Business Helpdesk", "type": "Business", "category": "general", "city": "Ibadan", "members": 5400, "impact": "92 SME leads exchanged this week"},
        {"_id": ObjectId(), "name": "Skilled Trade Experts", "type": "Industry", "category": "electrician", "city": "Online", "members": 3100, "impact": "61 urgent jobs resolved this week"},
        {"_id": ObjectId(), "name": "Home Repairs Circle", "type": "Industry", "category": "plumber", "city": "Online", "members": 2700, "impact": "44 verified referrals shared"},
    ]
    for community in defaults:
        await core.db.communities.insert_one(community)
