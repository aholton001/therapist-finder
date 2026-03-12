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
  similarity: number;
};

export type SearchParams = {
  location: string;
  query: string;
  useEnhancement?: boolean;
  limit?: number;
};

export async function searchTherapists(
  params: SearchParams
): Promise<{ results: TherapistResult[]; enhancedQuery: string }> {
  const { location, query, useEnhancement = true, limit = 20 } = params;

  const enhancedQuery = useEnhancement ? await enhanceQuery(query) : query;
  const embedding = await embedText(enhancedQuery);
  const embeddingStr = `[${embedding.join(",")}]`;

  // Parse location: could be "New York, NY" or a zip code
  const isZip = /^\d{5}$/.test(location.trim());

  let results: TherapistResult[];

  if (isZip) {
    results = await prisma.$queryRaw<TherapistResult[]>`
      SELECT
        id, "ptProfileUrl", name, credentials, bio, "photoUrl",
        city, state, "zipCode", specialties, issues, "therapyTypes",
        insurance, telehealth, "inPerson",
        1 - (embedding <=> ${embeddingStr}::vector) AS similarity
      FROM "Therapist"
      WHERE "zipCode" = ${location.trim()}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;
  } else {
    // Split "City, ST" or just "City"
    const parts = location.split(",").map((s) => s.trim());
    const city = parts[0];
    const state = parts[1] ?? null;

    results = await prisma.$queryRaw<TherapistResult[]>`
      SELECT
        id, "ptProfileUrl", name, credentials, bio, "photoUrl",
        city, state, "zipCode", specialties, issues, "therapyTypes",
        insurance, telehealth, "inPerson",
        1 - (embedding <=> ${embeddingStr}::vector) AS similarity
      FROM "Therapist"
      WHERE city ILIKE ${city}
        AND (${state}::text IS NULL OR state ILIKE ${state})
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;
  }

  // Log search asynchronously (fire and forget)
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
