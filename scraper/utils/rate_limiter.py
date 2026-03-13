import asyncio
import random
import logging
from config import settings

logger = logging.getLogger(__name__)


async def polite_delay() -> None:
    """Wait a random amount of time between requests."""
    delay = random.uniform(settings.crawl_delay_min, settings.crawl_delay_max)
    await asyncio.sleep(delay)


async def navigate_with_retry(page, url: str, wait_selector: str, max_retries: int = 2) -> bool:
    """Navigate to URL and wait for selector, with exponential backoff on failure."""
    for attempt in range(max_retries):
        try:
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")
            await page.wait_for_selector(wait_selector, timeout=8000)
            return True
        except Exception as e:
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}. Waiting {wait_time:.1f}s")
            if attempt < max_retries - 1:
                await asyncio.sleep(wait_time)
    return False
