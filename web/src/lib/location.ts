const STATE_ABBRS = new Set([
  "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id",
  "il","in","ia","ks","ky","la","me","md","ma","mi","mn","ms",
  "mo","mt","ne","nv","nh","nj","nm","ny","nc","nd","oh","ok",
  "or","pa","ri","sc","sd","tn","tx","ut","vt","va","wa","wv",
  "wi","wy","dc",
]);

const SLUG_OVERRIDES: Record<string, [string, string]> = {
  "ny:new-york-city": ["ny", "new-york"],
  "dc:washington-dc": ["dc", "washington"],
  "dc:washington-d-c": ["dc", "washington"],
};

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['.]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeLocation(
  location: string
): { state: string; city: string } | null {
  const trimmed = location.trim();

  // ZIP codes — can't derive a city slug
  if (/^\d{5}$/.test(trimmed)) return null;

  const commaIdx = trimmed.indexOf(",");
  if (commaIdx === -1) return null;

  const rawCity = trimmed.slice(0, commaIdx).trim();
  const rawState = trimmed.slice(commaIdx + 1).trim();

  const citySlug = toSlug(rawCity);
  if (!citySlug) return null;

  // Extract 2-letter abbreviation ("NY" or "NY 10001" → "ny")
  const stateMatch = rawState.toLowerCase().match(/^([a-z]{2})\b/);
  if (!stateMatch || !STATE_ABBRS.has(stateMatch[1])) return null;

  const stateAbbr = stateMatch[1];
  const key = `${stateAbbr}:${citySlug}`;
  const override = SLUG_OVERRIDES[key];
  if (override) return { state: override[0], city: override[1] };

  return { state: stateAbbr, city: citySlug };
}
