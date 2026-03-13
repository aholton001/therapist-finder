import asyncio
import logging
import httpx

logger = logging.getLogger(__name__)

NPPES_API = "https://npiregistry.cms.hhs.gov/api/"

# Taxonomy descriptions to search — covers the main mental health provider types
MENTAL_HEALTH_SEARCHES = [
    "mental health counselor",
    "marriage and family therapist",
    "clinical social worker",
    "clinical psychologist",
    "counseling psychologist",
    "psychiatry",
]

# Taxonomy codes we care about — filter out unrelated results from broad searches
MENTAL_HEALTH_CODES = {
    "101Y00000X", "101YM0800X", "101YA0400X", "101YP2500X", "101YS0200X",
    "103T00000X", "103TC0700X", "103TC2200X", "103TF0000X", "103TA0400X",
    "1041C0700X", "104100000X",
    "106H00000X",
    "2084P0800X", "2084P0804X",
}


async def fetch_providers_for_state(state: str, client: httpx.AsyncClient) -> list[dict]:
    """Fetch all active mental health providers for a state from the NPPES API."""
    seen_npis: set[str] = set()
    all_providers: list[dict] = []

    for search_term in MENTAL_HEALTH_SEARCHES:
        providers = await _fetch_taxonomy_state(state, search_term, client)
        for p in providers:
            npi = p.get("number")
            if not npi or npi in seen_npis:
                continue
            # Only keep providers whose taxonomy codes match our target set
            codes = {t.get("code", "") for t in p.get("taxonomies", [])}
            if codes & MENTAL_HEALTH_CODES:
                seen_npis.add(npi)
                all_providers.append(p)

    logger.info(f"NPPES: {len(all_providers)} unique mental health providers in {state}")
    return all_providers


async def _fetch_taxonomy_state(state: str, taxonomy: str, client: httpx.AsyncClient) -> list[dict]:
    """Paginate through NPPES results for a taxonomy + state (max 1200 per query)."""
    results = []
    skip = 0
    limit = 200

    while True:
        params = {
            "version": "2.1",
            "enumeration_type": "NPI-1",
            "taxonomy_description": taxonomy,
            "state": state,
            "limit": limit,
            "skip": skip,
        }
        try:
            resp = await client.get(NPPES_API, params=params, timeout=30.0)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning(f"NPPES API error ({taxonomy}/{state} skip={skip}): {e}")
            break

        batch = [p for p in data.get("results", []) if p.get("basic", {}).get("status") == "A"]
        results.extend(batch)

        if len(data.get("results", [])) < limit or skip >= 1000:
            break
        skip += limit
        await asyncio.sleep(0.3)

    logger.info(f"  {taxonomy}/{state}: {len(results)} active providers")
    return results
