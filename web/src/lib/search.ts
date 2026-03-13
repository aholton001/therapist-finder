import { prisma } from "./db";
import { embedText } from "./embeddings";
import { enhanceQuery } from "./claude";

export type TherapistResult = {
  id: string;
  ptProfileUrl: string;
  name: string;
  credentials: string | null;
  bio: string | null;
  photoUrl: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  specialties: string[];
  issues: string[];
  therapyTypes: string[];
  insurance: string[];
  telehealth: boolean;
  inPerson: boolean;
  source: string;
  similarity: number;
};

export type SearchParams = {
  location: string;
  query: string;
  insurance?: string | null;
  sessionFormat?: "in-person" | "telehealth" | null;
  useEnhancement?: boolean;
  limit?: number;
};

/** Generate alternate city spelling to handle Saint/St variations. */
function cityAlternate(city: string): string {
  if (/\bSaint\b/i.test(city)) return city.replace(/\bSaint\b/gi, "St.");
  if (/\bSt\.\s/i.test(city) || /\bSt\b/i.test(city)) return city.replace(/\bSt\.?\b/gi, "Saint");
  return city;
}

export async function searchTherapists(
  params: SearchParams
): Promise<{ results: TherapistResult[]; enhancedQuery: string }> {
  const {
    location,
    query,
    insurance,
    sessionFormat,
    useEnhancement = true,
    limit = 20,
  } = params;

  const enhancedQuery = useEnhancement ? await enhanceQuery(query) : query;
  const embedding = await embedText(enhancedQuery);
  const embeddingStr = `[${embedding.join(",")}]`;

  const isZip = /^\d{5}$/.test(location.trim());
  const parts = location.split(",").map((s) => s.trim());
  const city = isZip ? null : parts[0];
  const cityAlt = city ? cityAlternate(city) : null;
  const state = isZip ? null : (parts[1] ?? null);
  const zip = isZip ? location.trim() : null;

  const insuranceFilter = insurance ?? null;
  const telehealthOnly = sessionFormat === "telehealth";
  const inPersonOnly = sessionFormat === "in-person";

  const results = await prisma.$queryRaw<TherapistResult[]>`
    SELECT
      id, "ptProfileUrl", name, credentials, bio, "photoUrl",
      city, state, "zipCode", specialties, issues, "therapyTypes",
      insurance, telehealth, "inPerson", source,
      1 - (embedding <=> ${embeddingStr}::vector) AS similarity
    FROM "Therapist"
    WHERE embedding IS NOT NULL
      AND (
        (${zip}::text IS NOT NULL AND "zipCode" = ${zip})
        OR
        (${city}::text IS NOT NULL
          AND (city ILIKE ${city} OR city ILIKE ${cityAlt})
          AND (${state}::text IS NULL OR state ILIKE ${state}))
      )
      AND (
        ${insuranceFilter}::text IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(insurance) ins
          WHERE ins ILIKE ${"%" + (insuranceFilter ?? "") + "%"}
        )
      )
      AND (NOT ${telehealthOnly} OR telehealth = true)
      AND (NOT ${inPersonOnly} OR "inPerson" = true)
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `;

  prisma.searchLog
    .create({
      data: {
        rawQuery: query,
        enhancedQuery,
        location,
        resultCount: results.length,
      },
    })
    .catch(() => {});

  return { results, enhancedQuery };
}

/** Pull distinct normalized insurance values for a location to populate the filter dropdown. */
export async function getInsuranceOptions(location: string): Promise<string[]> {
  const isZip = /^\d{5}$/.test(location.trim());
  const parts = location.split(",").map((s) => s.trim());
  const city = isZip ? null : parts[0];
  const cityAlt = city ? cityAlternate(city) : null;
  const state = isZip ? null : (parts[1] ?? null);
  const zip = isZip ? location.trim() : null;

  const rows = await prisma.$queryRaw<{ ins: string }[]>`
    SELECT DISTINCT unnest(insurance) AS ins
    FROM "Therapist"
    WHERE (
      (${zip}::text IS NOT NULL AND "zipCode" = ${zip})
      OR
      (${city}::text IS NOT NULL
        AND (city ILIKE ${city} OR city ILIKE ${cityAlt})
        AND (${state}::text IS NULL OR state ILIKE ${state}))
    )
    ORDER BY ins
  `;

  return rows
    .map((r) => r.ins)
    .filter((s) => s && s.length < 60 && !s.startsWith("*") && !s.startsWith("For ") && !s.startsWith("My "));
}
