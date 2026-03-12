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
) -> list[str]:
    """
    Collect therapist profile URLs for a given city.

    state_slug: e.g. "new-york"
    city_slug:  e.g. "new-york-city" or "brooklyn"
    """
    profile_urls: list[str] = []
    page = await context.new_page()

    # Warm up session with homepage first
    try:
        await page.goto(PT_BASE, timeout=15000, wait_until="domcontentloaded")
        await polite_delay()
    except Exception:
        pass

    for page_num in range(1, max_pages + 1):
        url = f"{PT_BASE}/us/therapists/{state_slug}/{city_slug}"
        if page_num > 1:
            url += f"?page={page_num}"

        logger.info(f"Scraping listing page {page_num}: {url}")

        success = await navigate_with_retry(
            page, url,
            wait_selector=".results-row, [data-testid='results-container'], .profile-listing",
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

        # Extract profile URLs
        links = await page.locator("a[href*='/us/therapists/']").all()
        page_urls = []
        for link in links:
            href = await link.get_attribute("href")
            if href and "/us/therapists/" in href:
                # Only individual profile pages (not listing pages)
                # Profile URLs have a numeric ID at the end e.g. /us/therapists/john-doe/123456
                parts = href.rstrip("/").split("/")
                if len(parts) >= 6 and parts[-1].isdigit():
                    full_url = PT_BASE + href if href.startswith("/") else href
                    # Strip query params
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
