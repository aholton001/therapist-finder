import logging
import asyncpg
from openai import AsyncOpenAI
from models.therapist import TherapistProfile
from config import settings
from utils.insurance import normalize_insurance

logger = logging.getLogger(__name__)
openai = AsyncOpenAI(api_key=settings.openai_api_key)


async def embed_and_upsert(profiles: list[TherapistProfile], pool: asyncpg.Pool) -> int:
    """
    Embed each therapist profile and upsert into the database.
    Returns the number of successfully upserted records.
    """
    if not profiles:
        return 0

    # Build embedding texts
    texts = [p.embedding_text() for p in profiles]

    # Batch embed (OpenAI accepts up to 2048 inputs per call, but keep batches manageable)
    embeddings = await _batch_embed(texts)

    upserted = 0
    for profile, embedding in zip(profiles, embeddings):
        if embedding is None:
            continue
        try:
            await _upsert_therapist(pool, profile, embedding)
            upserted += 1
        except Exception as e:
            logger.error(f"Failed to upsert {profile.pt_profile_url}: {e}")

    logger.info(f"Upserted {upserted}/{len(profiles)} therapists")
    return upserted


async def _batch_embed(texts: list[str]) -> list[list[float] | None]:
    results: list[list[float] | None] = []
    batch_size = 100

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        try:
            response = await openai.embeddings.create(
                model="text-embedding-3-small",
                input=batch,
                encoding_format="float",
            )
            batch_embeddings = [item.embedding for item in sorted(response.data, key=lambda x: x.index)]
            results.extend(batch_embeddings)
            logger.info(f"Embedded batch {i // batch_size + 1} ({len(batch)} items)")
        except Exception as e:
            logger.error(f"Embedding batch failed: {e}")
            results.extend([None] * len(batch))

    return results


async def _upsert_therapist(pool: asyncpg.Pool, profile: TherapistProfile, embedding: list[float]) -> None:
    embedding_str = f"[{','.join(str(x) for x in embedding)}]"

    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO "Therapist" (
                id, "ptProfileUrl", name, credentials, bio, "photoUrl",
                city, state, "zipCode", lat, lng,
                specialties, issues, "therapyTypes", insurance,
                telehealth, "inPerson", embedding,
                "scrapedAt", "updatedAt"
            ) VALUES (
                gen_random_uuid()::text, $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14,
                $15, $16, $17::vector,
                NOW(), NOW()
            )
            ON CONFLICT ("ptProfileUrl") DO UPDATE SET
                name = EXCLUDED.name,
                credentials = EXCLUDED.credentials,
                bio = EXCLUDED.bio,
                "photoUrl" = EXCLUDED."photoUrl",
                city = EXCLUDED.city,
                state = EXCLUDED.state,
                "zipCode" = EXCLUDED."zipCode",
                specialties = EXCLUDED.specialties,
                issues = EXCLUDED.issues,
                "therapyTypes" = EXCLUDED."therapyTypes",
                insurance = EXCLUDED.insurance,
                telehealth = EXCLUDED.telehealth,
                "inPerson" = EXCLUDED."inPerson",
                embedding = EXCLUDED.embedding,
                "updatedAt" = NOW()
            """,
            profile.pt_profile_url,
            profile.name,
            profile.credentials,
            profile.bio,
            profile.photo_url,
            profile.city,
            profile.state,
            profile.zip_code,
            profile.lat,
            profile.lng,
            profile.specialties,
            profile.issues,
            profile.therapy_types,
            normalize_insurance(profile.insurance),
            profile.telehealth,
            profile.in_person,
            embedding_str,
        )
