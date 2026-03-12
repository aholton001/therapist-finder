import logging
import re
from playwright.async_api import BrowserContext
from models.therapist import TherapistProfile
from utils.rate_limiter import polite_delay, navigate_with_retry

logger = logging.getLogger(__name__)


async def scrape_profile(context: BrowserContext, url: str) -> TherapistProfile | None:
    """Scrape a single therapist profile page."""
    page = await context.new_page()

    try:
        success = await navigate_with_retry(
            page, url,
            wait_selector=".profile-header, [data-testid='profile-header'], h1.profile-title, .profile-name",
        )
        if not success:
            logger.warning(f"Failed to load profile: {url}")
            return None

        # Expand "See more" sections
        for btn_text in ["See More", "Read More", "Show More"]:
            try:
                btn = page.locator(f"button:has-text('{btn_text}')").first
                if await btn.is_visible():
                    await btn.click()
                    await page.wait_for_timeout(500)
            except Exception:
                pass

        # --- Extract fields ---

        # Name
        name = await _text_from_selectors(page, [
            "h1.profile-title", ".profile-name", "h1[itemprop='name']", "h1"
        ])
        if not name:
            logger.warning(f"No name found at {url}, skipping")
            return None

        # Credentials
        credentials = await _text_from_selectors(page, [
            ".profile-subtitle", ".profile-credentials", "[itemprop='description']"
        ])

        # Bio / About
        bio = await _text_from_selectors(page, [
            ".profile-bio", ".profile-statement", "[data-testid='profile-bio']",
            ".about-me-section p", "#about-me",
        ])

        # Photo
        photo_url = await _attr_from_selectors(page, [
            ".profile-image img", ".profile-photo img", "img.profile-picture",
            "[itemprop='image']",
        ], "src")

        # Location
        location_text = await _text_from_selectors(page, [
            ".profile-location", "[itemprop='address']", ".location",
        ])
        city, state, zip_code = _parse_location(location_text)

        # Tags: specialties, issues, therapy types
        specialties = await _extract_tag_list(page, [
            "[data-testid='specialties']", ".profile-specialties", "#specialties",
        ])
        issues = await _extract_tag_list(page, [
            "[data-testid='issues']", ".profile-issues", "#issues",
        ])
        therapy_types = await _extract_tag_list(page, [
            "[data-testid='therapy-types']", ".profile-types", "#therapy-types",
            ".modalities",
        ])
        insurance = await _extract_tag_list(page, [
            "[data-testid='insurance']", ".profile-insurance", "#insurance",
        ])

        # Telehealth / in-person
        page_text = (await page.inner_text("body")).lower()
        telehealth = "telehealth" in page_text or "online therapy" in page_text or "video" in page_text
        in_person = "in-person" in page_text or "in person" in page_text or "office" in page_text

        profile = TherapistProfile(
            pt_profile_url=url,
            name=name,
            credentials=credentials,
            bio=bio,
            photo_url=photo_url,
            city=city,
            state=state,
            zip_code=zip_code,
            specialties=specialties,
            issues=issues,
            therapy_types=therapy_types,
            insurance=insurance,
            telehealth=telehealth,
            in_person=in_person,
        )

        await polite_delay()
        return profile

    except Exception as e:
        logger.error(f"Error scraping {url}: {e}")
        return None
    finally:
        await page.close()


async def _text_from_selectors(page, selectors: list[str]) -> str | None:
    for selector in selectors:
        try:
            el = page.locator(selector).first
            if await el.is_visible():
                text = await el.inner_text()
                if text.strip():
                    return text.strip()
        except Exception:
            continue
    return None


async def _attr_from_selectors(page, selectors: list[str], attr: str) -> str | None:
    for selector in selectors:
        try:
            el = page.locator(selector).first
            if await el.is_visible():
                val = await el.get_attribute(attr)
                if val:
                    return val
        except Exception:
            continue
    return None


async def _extract_tag_list(page, selectors: list[str]) -> list[str]:
    for selector in selectors:
        try:
            container = page.locator(selector).first
            if await container.is_visible():
                items = await container.locator("li, .tag, span.item").all()
                tags = []
                for item in items:
                    text = await item.inner_text()
                    if text.strip():
                        tags.append(text.strip())
                if tags:
                    return tags
        except Exception:
            continue
    return []


def _parse_location(location_text: str | None) -> tuple[str | None, str | None, str | None]:
    if not location_text:
        return None, None, None

    # Try to find zip code
    zip_match = re.search(r"\b(\d{5})\b", location_text)
    zip_code = zip_match.group(1) if zip_match else None

    # Try "City, ST" pattern
    # e.g. "New York, NY 10001" or "Brooklyn, New York"
    city_state = re.search(r"([A-Za-z\s]+),\s*([A-Z]{2})", location_text)
    if city_state:
        return city_state.group(1).strip(), city_state.group(2).strip(), zip_code

    return None, None, zip_code
