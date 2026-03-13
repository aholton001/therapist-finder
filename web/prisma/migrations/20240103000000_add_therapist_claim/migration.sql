CREATE TABLE "TherapistClaim" (
    "id" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TherapistClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TherapistClaim_therapistId_key" ON "TherapistClaim"("therapistId");
CREATE UNIQUE INDEX "TherapistClaim_token_key" ON "TherapistClaim"("token");

ALTER TABLE "TherapistClaim" ADD CONSTRAINT "TherapistClaim_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
