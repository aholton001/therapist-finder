"""
Import mental health providers from the NPPES NPI Registry.

Usage:
  python nppes_import.py --states NY CA TX
  python nppes_import.py --states ALL
"""
import asyncio
import argparse
import logging
import httpx
import asyncpg

from config import settings
from models.therapist import TherapistProfile
from pipeline.embedder import embed_and_upsert
from nppes.fetcher import fetch_providers_for_state
from nppes.bio_generator import provider_to_profile

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
]


async def import_state(state: str, pool: asyncpg.Pool, client: httpx.AsyncClient) -> int:
    providers = await fetch_providers_for_state(state, client)

    profiles = []
    for p in providers:
        data = provider_to_profile(p)
        if not data:
            continue
        try:
            profiles.append(TherapistProfile(**data))
        except Exception as e:
            logger.debug(f"Skipping provider: {e}")

    logger.info(f"{state}: {len(profiles)} valid profiles, embedding and upserting...")

    total = 0
    for i in range(0, len(profiles), 100):
        total += await embed_and_upsert(profiles[i : i + 100], pool)

    logger.info(f"{state}: done — {total} upserted")
    return total


async def main(args: argparse.Namespace) -> None:
    states = US_STATES if args.states == ["ALL"] else [s.upper() for s in args.states]
    pool = await asyncpg.create_pool(settings.database_url)

    try:
        grand_total = 0
        async with httpx.AsyncClient() as client:
            for state in states:
                grand_total += await import_state(state, pool, client)
        logger.info(f"Import complete — {grand_total} total providers upserted")
    finally:
        await pool.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--states", nargs="+", required=True,
        help="State codes (e.g. NY CA TX) or ALL for every state",
    )
    args = parser.parse_args()
    asyncio.run(main(args))
