import logging
import re
from playwright.async_api import BrowserContext
from models.therapist import TherapistProfile
from utils.rate_limiter import polite_delay, navigate_with_retry

logger = logging.getLogger(__name__)


async def scrape_profile(context: BrowserContext, url: str) -> TherapistProfile | None:
    page = await context.new_page()

    try:
        success = await navigate_with_retry(
            page, url,
            wait_selector=".profile-title",
        )
        if not success:
            logger.warning(f"Failed to load profile: {url}")
            return None

        # Name
        name = await _text(".profile-title", page)
        if not name:
            logger.warning(f"No name found at {url}, skipping")
            return None

        # Credentials
        credentials = await _text(".profile-subtitle", page)

        # Bio
        bio = await _text(".personal-statement", page)

        # Photo
        photo_url = await _attr(".profile-photo img, .profile-grid-photo img", "src", page)

        # Location — "New York, NY 10016"
        location_text = await _text(".address-region", page) or await _text(".address-text", page) or await _text(".address-line", page)
        city, state, zip_code = _parse_location(location_text)

        # Specialties
        specialties = await _tag_list(".specialty-attributes-section .specialty, .specialty-attributes-section li", page)

        # Issues
        issues = await _tag_list(".attribute-subheading ~ .attributes li, .attributes-group li", page)

        # Therapy types
        therapy_types = await _tag_list(".treatment li, .modality li, [class*='treatment-orientation'] li", page)

        # Insurance
        insurance = await _tag_list(".insurance li", page)

        # Telehealth / in-person
        page_text = (await page.inner_text("body")).lower()
        telehealth = "online" in page_text or "telehealth" in page_text
        in_person = "in-person" in page_text or "in person" in page_text

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


async def _text(selector: str, page) -> str | None:
    try:
        el = page.locator(selector).first
        if await el.count() > 0:
            text = await el.inner_text()
            return text.strip() or None
    except Exception:
        pass
    return None


async def _attr(selector: str, attr: str, page) -> str | None:
    try:
        el = page.locator(selector).first
        if await el.count() > 0:
            val = await el.get_attribute(attr)
            return val or None
    except Exception:
        pass
    return None


async def _tag_list(selector: str, page) -> list[str]:
    try:
        items = await page.locator(selector).all()
        tags = []
        for item in items:
            text = (await item.inner_text()).strip()
            if text:
                tags.append(text)
        return tags
    except Exception:
        return []


def _parse_location(location_text: str | None) -> tuple[str | None, str | None, str | None]:
    if not location_text:
        return None, None, None

    zip_match = re.search(r"\b(\d{5})\b", location_text)
    zip_code = zip_match.group(1) if zip_match else None

    # "New York, NY 10016"
    city_state = re.search(r"([A-Za-z\s\.]+),\s*([A-Z]{2})", location_text)
    if city_state:
        return city_state.group(1).strip(), city_state.group(2).strip(), zip_code

    return None, None, zip_code
