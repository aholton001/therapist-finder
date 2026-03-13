"""
FastAPI service for on-demand scraping.

Run locally:
  uvicorn api:app --reload --port 8000
"""
import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from typing import Literal

import asyncpg
from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel

from config import settings
from main import scrape_city

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# In-memory job store
jobs: dict[str, dict] = {}
db_pool: asyncpg.Pool | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)
    logger.info("DB pool created")
    yield
    await db_pool.close()
    logger.info("DB pool closed")


app = FastAPI(lifespan=lifespan)


class ScrapeRequest(BaseModel):
    state: str  # "ny"
    city: str   # "new-york"
    max_pages: int = 3


class ScrapeResponse(BaseModel):
    job_id: str
    status: str


class JobStatus(BaseModel):
    status: Literal["pending", "running", "done", "error"]
    state: str
    city: str
    count: int | None = None
    error: str | None = None


def _running_job_for_city(state: str, city: str) -> str | None:
    for job_id, job in jobs.items():
        if job["state"] == state and job["city"] == city:
            if job["status"] in ("pending", "running"):
                return job_id
    return None


async def _run_scrape(job_id: str, state: str, city: str, max_pages: int) -> None:
    jobs[job_id]["status"] = "running"
    try:
        await scrape_city(state, city, max_pages, db_pool)

        # Count results for this city
        async with db_pool.acquire() as conn:
            city_name = city.replace("-", " ")
            count = await conn.fetchval(
                'SELECT COUNT(*) FROM "Therapist" WHERE city ILIKE $1 AND state ILIKE $2',
                f"%{city_name}%",
                state,
            )
        jobs[job_id]["status"] = "done"
        jobs[job_id]["count"] = count or 0
        logger.info(f"Job {job_id} done: {count} therapists for {city}, {state}")
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)


@app.post("/scrape", response_model=ScrapeResponse)
async def trigger_scrape(req: ScrapeRequest, background_tasks: BackgroundTasks):
    existing = _running_job_for_city(req.state, req.city)
    if existing:
        return ScrapeResponse(job_id=existing, status="already_running")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "pending",
        "state": req.state,
        "city": req.city,
        "count": None,
        "error": None,
    }
    background_tasks.add_task(_run_scrape, job_id, req.state, req.city, req.max_pages)
    return ScrapeResponse(job_id=job_id, status="pending")


@app.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatus(**jobs[job_id])


@app.get("/health")
async def health():
    return {"ok": True}
