from typing import Optional

from fastapi import Depends

import core
from services.jobs import (
    accept_job as accept_job_service,
    create_job as create_job_service,
    get_job_by_id,
    get_my_accepted_jobs as get_my_accepted_jobs_service,
    get_my_posted_jobs as get_my_posted_jobs_service,
    list_jobs,
    update_job_status as update_job_status_service,
)


@core.api_router.post("/jobs")
async def create_job(job_data: core.JobCreate, current_user: dict = Depends(core.get_current_user)):
    return await create_job_service(current_user, job_data.model_dump())


@core.api_router.get("/jobs")
async def get_jobs(
    status: Optional[str] = None,
    category: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    current_user: dict = Depends(core.get_current_user),
):
    return await list_jobs(status=status, category=category, lat=lat, lng=lng)


@core.api_router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    return await get_job_by_id(job_id)


@core.api_router.get("/jobs/my/posted")
async def get_my_posted_jobs(current_user: dict = Depends(core.get_current_user)):
    return await get_my_posted_jobs_service(current_user["_id"])


@core.api_router.get("/jobs/my/accepted")
async def get_my_accepted_jobs(current_user: dict = Depends(core.get_current_user)):
    return await get_my_accepted_jobs_service(current_user["_id"])


@core.api_router.put("/jobs/{job_id}/accept")
async def accept_job(job_id: str, current_user: dict = Depends(core.get_current_user)):
    return await accept_job_service(job_id, current_user)


@core.api_router.put("/jobs/{job_id}/status")
async def update_job_status(job_id: str, status_update: core.JobUpdate, current_user: dict = Depends(core.get_current_user)):
    return await update_job_status_service(job_id, current_user["_id"], status_update)
