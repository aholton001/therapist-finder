import logging
from playwright.async_api import BrowserContext
from utils.rate_limiter import polite_delay, navigate_with_retry

logger = logging.getLogger(__name__)

PT_BASE = "https://www.psychologytoday.com"


async def get_profile_urls_for_city(
    context: BrowserContext,
    state_slug: str,
    city_slug: str,
    max_pages: int = 10,
    start_page: int = 1,
) -> list[str]:
    """
    Collect therapist profile URLs for a given city.

    state_slug: 2-letter state abbreviation e.g. "ny", "ca", "il"
    city_slug:  city slug e.g. "new-york", "los-angeles"
    start_page: page number to start from (1-indexed)
    """
    profile_urls: list[str] = []
    page = await context.new_page()

    # Warm up session with homepage first
    try:
        await page.goto(PT_BASE, timeout=15000, wait_until="domcontentloaded")
        await polite_delay()
    except Exception:
        pass

    for page_num in range(start_page, start_page + max_pages):
        url = f"{PT_BASE}/us/therapists/{state_slug}/{city_slug}"
        if page_num > 1:
            url += f"?page={page_num}"

        logger.info(f"Scraping listing page {page_num}: {url}")

        success = await navigate_with_retry(
            page, url,
            wait_selector=".results-row",
        )

        if not success:
            logger.warning(f"Failed to load listing page {page_num}, stopping pagination")
            break

        # Expand any "See More" if present
        try:
            see_more = page.locator("button:has-text('Load More'), button:has-text('Show More')")
            if await see_more.is_visible():
                await see_more.click()
                await page.wait_for_timeout(1500)
        except Exception:
            pass

        # Extract profile URLs from result cards only
        links = await page.locator(".results-row a[href*='/us/therapists/']").all()
        page_urls = []
        for link in links:
            href = await link.get_attribute("href")
            if not href:
                continue
            # Individual profile URLs end in a numeric ID
            # e.g. /us/therapists/fran-v-dillon-new-york-ny/83599
            parts = href.rstrip("/").split("/")
            if len(parts) >= 2 and parts[-1].isdigit():
                full_url = PT_BASE + href if href.startswith("/") else href
                full_url = full_url.split("?")[0]
                page_urls.append(full_url)

        new_urls = [u for u in page_urls if u not in profile_urls]
        profile_urls.extend(new_urls)
        logger.info(f"Found {len(new_urls)} new profiles on page {page_num} ({len(profile_urls)} total)")

        if len(new_urls) == 0:
            logger.info("No new profiles found, stopping pagination")
            break

        await polite_delay()

    await page.close()
    return list(dict.fromkeys(profile_urls))  # deduplicate preserving order
