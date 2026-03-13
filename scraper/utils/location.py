import re
import unicodedata

STATE_NAME_TO_ABBR = {
    "alabama": "al", "alaska": "ak", "arizona": "az", "arkansas": "ar",
    "california": "ca", "colorado": "co", "connecticut": "ct", "delaware": "de",
    "florida": "fl", "georgia": "ga", "hawaii": "hi", "idaho": "id",
    "illinois": "il", "indiana": "in", "iowa": "ia", "kansas": "ks",
    "kentucky": "ky", "louisiana": "la", "maine": "me", "maryland": "md",
    "massachusetts": "ma", "michigan": "mi", "minnesota": "mn", "mississippi": "ms",
    "missouri": "mo", "montana": "mt", "nebraska": "ne", "nevada": "nv",
    "new hampshire": "nh", "new jersey": "nj", "new mexico": "nm", "new york": "ny",
    "north carolina": "nc", "north dakota": "nd", "ohio": "oh", "oklahoma": "ok",
    "oregon": "or", "pennsylvania": "pa", "rhode island": "ri", "south carolina": "sc",
    "south dakota": "sd", "tennessee": "tn", "texas": "tx", "utah": "ut",
    "vermont": "vt", "virginia": "va", "washington": "wa", "west virginia": "wv",
    "wisconsin": "wi", "wyoming": "wy", "district of columbia": "dc",
}

VALID_ABBRS = set(STATE_NAME_TO_ABBR.values())

# PT uses non-obvious slugs for a handful of cities
SLUG_OVERRIDES: dict[tuple[str, str], tuple[str, str]] = {
    ("ny", "new-york-city"): ("ny", "new-york"),
    ("dc", "washington-dc"): ("dc", "washington"),
    ("dc", "washington-d-c"): ("dc", "washington"),
}


def normalize_location(location: str) -> tuple[str, str] | None:
    """
    Convert "New York, NY" → ("ny", "new-york")
    Returns None if the location can't be parsed (ZIP code, missing state, etc.)
    """
    location = location.strip()

    if re.match(r"^\d{5}$", location):
        return None

    parts = [p.strip() for p in location.split(",", 1)]
    if len(parts) != 2:
        return None

    raw_city, raw_state = parts
    city_slug = _to_slug(raw_city)
    if not city_slug:
        return None

    state_lower = raw_state.strip().lower()

    # Try 2-letter abbreviation (handles "NY" and "NY 10001")
    abbr_match = re.match(r"^([a-z]{2})\b", state_lower)
    if abbr_match and abbr_match.group(1) in VALID_ABBRS:
        state_abbr = abbr_match.group(1)
    elif state_lower in STATE_NAME_TO_ABBR:
        state_abbr = STATE_NAME_TO_ABBR[state_lower]
    else:
        return None

    result = (state_abbr, city_slug)
    return SLUG_OVERRIDES.get(result, result)


def _to_slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"['\.]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")
