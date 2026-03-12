-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "Therapist" (
    "id" TEXT NOT NULL,
    "ptProfileUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credentials" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "issues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "therapyTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "insurance" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "telehealth" BOOLEAN NOT NULL DEFAULT false,
    "inPerson" BOOLEAN NOT NULL DEFAULT true,
    "embedding" vector(1536),
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Therapist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchLog" (
    "id" TEXT NOT NULL,
    "rawQuery" TEXT NOT NULL,
    "enhancedQuery" TEXT,
    "location" TEXT,
    "resultCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Therapist_ptProfileUrl_key" ON "Therapist"("ptProfileUrl");
CREATE INDEX "Therapist_city_state_idx" ON "Therapist"("city", "state");
CREATE INDEX "Therapist_zipCode_idx" ON "Therapist"("zipCode");

-- HNSW index for fast cosine similarity search
CREATE INDEX ON "Therapist" USING hnsw (embedding vector_cosine_ops);
