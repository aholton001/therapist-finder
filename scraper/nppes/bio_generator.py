TAXONOMY_CODE_TO_DESC = {
    "101Y00000X": "counseling",
    "101YM0800X": "mental health counseling",
    "101YA0400X": "addiction and substance use counseling",
    "101YP2500X": "professional counseling",
    "101YS0200X": "school counseling",
    "103T00000X": "psychology",
    "103TC0700X": "clinical psychology",
    "103TC2200X": "counseling psychology",
    "103TF0000X": "family psychology",
    "103TA0400X": "addiction psychology",
    "1041C0700X": "clinical social work",
    "104100000X": "social work",
    "106H00000X": "marriage and family therapy",
    "2084P0800X": "psychiatry",
    "2084P0804X": "addiction psychiatry",
}

CREDENTIAL_TO_TYPE = {
    "LCSW": "Licensed Clinical Social Worker",
    "LMFT": "Licensed Marriage and Family Therapist",
    "LPC": "Licensed Professional Counselor",
    "LPCC": "Licensed Professional Clinical Counselor",
    "LMHC": "Licensed Mental Health Counselor",
    "PHD": "Psychologist",
    "PSYD": "Psychologist",
    "MD": "Psychiatrist",
    "DO": "Psychiatrist",
    "MSW": "Social Worker",
    "LMSW": "Licensed Master Social Worker",
    "MA": "Therapist",
    "MS": "Therapist",
    "MFT": "Marriage and Family Therapist",
}


def _get_provider_type(credential: str | None, primary_code: str) -> str:
    if credential:
        cred_upper = credential.upper().replace(".", "")
        for key, label in CREDENTIAL_TO_TYPE.items():
            if key in cred_upper:
                return label
    return TAXONOMY_CODE_TO_DESC.get(primary_code, "mental health professional").title()


def generate_bio(provider: dict) -> str:
    basic = provider.get("basic", {})
    first = basic.get("first_name", "").strip().title()
    last = basic.get("last_name", "").strip().title()
    name = f"{first} {last}".strip()
    credential = basic.get("credential", "").strip() or None

    location_addr = next(
        (a for a in provider.get("addresses", []) if a.get("address_purpose") == "LOCATION"),
        (provider.get("addresses") or [{}])[0],
    )
    city = location_addr.get("city", "").strip().title()
    state = location_addr.get("state", "").strip().upper()
    location_str = f"in {city}, {state}" if city and state else f"in {state}" if state else ""

    taxonomies = provider.get("taxonomies", [])
    primary = next((t for t in taxonomies if t.get("primary")), taxonomies[0] if taxonomies else {})
    primary_code = primary.get("code", "")
    primary_desc = TAXONOMY_CODE_TO_DESC.get(primary_code, primary.get("desc", "mental health counseling").lower())

    other_descs = list({
        TAXONOMY_CODE_TO_DESC.get(t["code"], "")
        for t in taxonomies
        if not t.get("primary") and TAXONOMY_CODE_TO_DESC.get(t.get("code", ""))
    } - {primary_desc})

    provider_type = _get_provider_type(credential, primary_code)
    cred_str = f", {credential}" if credential else ""

    bio = (
        f"{name}{cred_str} is a {provider_type} {location_str}. "
        f"They provide {primary_desc} services to individuals seeking mental health support."
    )
    if other_descs:
        bio += f" Their practice also encompasses {', '.join(other_descs[:2])}."

    return bio.strip()


def provider_to_profile(provider: dict) -> dict | None:
    basic = provider.get("basic", {})
    npi = provider.get("number", "")
    if not npi:
        return None

    first = basic.get("first_name", "").strip().title()
    last = basic.get("last_name", "").strip().title()
    name = f"{first} {last}".strip()
    if not name:
        return None

    credential = basic.get("credential", "").strip() or None

    location_addr = next(
        (a for a in provider.get("addresses", []) if a.get("address_purpose") == "LOCATION"),
        (provider.get("addresses") or [{}])[0],
    )
    city = location_addr.get("city", "").strip().title() or None
    state = location_addr.get("state", "").strip().upper() or None
    zip_code = (location_addr.get("postal_code", "") or "")[:5] or None

    taxonomies = provider.get("taxonomies", [])
    taxonomy_descs = list({t.get("desc", "") for t in taxonomies if t.get("desc")})

    return {
        "pt_profile_url": f"https://npiregistry.cms.hhs.gov/provider-view/{npi}",
        "name": name,
        "credentials": credential,
        "bio": generate_bio(provider),
        "city": city,
        "state": state,
        "zip_code": zip_code,
        "specialties": taxonomy_descs,
        "source": "nppes",
    }
