"""
Therapist scraper entrypoint.

Usage:
  python main.py --state ny --city new-york
  python main.py --state ca --city los-angeles --max-pages 20
"""
import asyncio
import argparse
import logging
import asyncpg
from playwright.async_api import async_playwright

from config import settings
from crawler.browser import create_browser_context
from crawler.listing_crawler import get_profile_urls_for_city
from crawler.profile_crawler import scrape_profile
from models.therapist import TherapistProfile
from pipeline.embedder import embed_and_upsert

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# Popular US cities to seed the scraper
# Format: (state_abbreviation, city_slug)
DEFAULT_CITIES = [
    ("ny", "new-york"),
    ("ca", "los-angeles"),
    ("il", "chicago"),
    ("tx", "houston"),
    ("az", "phoenix"),
    ("pa", "philadelphia"),
    ("tx", "san-antonio"),
    ("ca", "san-diego"),
    ("tx", "dallas"),
    ("ca", "san-jose"),
]


PROFILE_CONCURRENCY = 5


async def scrape_city(state_slug: str, city_slug: str, max_pages: int, pool: asyncpg.Pool) -> None:
    logger.info(f"Starting scrape: {city_slug}, {state_slug}")

    async with async_playwright() as playwright:
        context = await create_browser_context(playwright, headless=settings.headless)

        try:
            # Step 1: Collect profile URLs
            profile_urls = await get_profile_urls_for_city(
                context, state_slug, city_slug, max_pages=max_pages
            )
            logger.info(f"Found {len(profile_urls)} profile URLs for {city_slug}")

            # Step 2: Scrape profiles concurrently with a semaphore
            sem = asyncio.Semaphore(PROFILE_CONCURRENCY)

            async def bounded_scrape(i: int, url: str) -> TherapistProfile | None:
                async with sem:
                    logger.info(f"Scraping profile {i + 1}/{len(profile_urls)}: {url}")
                    return await scrape_profile(context, url)

            results = await asyncio.gather(
                *[bounded_scrape(i, url) for i, url in enumerate(profile_urls)]
            )
            profiles = [p for p in results if p]

            # Step 3: Embed and upsert in batches
            for i in range(0, len(profiles), settings.batch_size):
                await embed_and_upsert(profiles[i : i + settings.batch_size], pool)

        finally:
            await context.browser.close()

    logger.info(f"Finished scraping {city_slug}")


async def main(args: argparse.Namespace) -> None:
    pool = await asyncpg.create_pool(settings.database_url)

    try:
        if args.state and args.city:
            await scrape_city(args.state, args.city, args.max_pages, pool)
        else:
            # Scrape all default cities
            for state_slug, city_slug in DEFAULT_CITIES:
                await scrape_city(state_slug, city_slug, args.max_pages, pool)
    finally:
        await pool.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape Psychology Today therapist listings")
    parser.add_argument("--state", help="State slug, e.g. 'new-york'")
    parser.add_argument("--city", help="City slug, e.g. 'new-york-city'")
    parser.add_argument("--max-pages", type=int, default=10, help="Max listing pages per city")
    args = parser.parse_args()

    asyncio.run(main(args))
