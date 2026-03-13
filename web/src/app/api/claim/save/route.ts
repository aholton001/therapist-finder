import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const SaveSchema = z.object({
  token: z.string(),
  bio: z.string().min(1),
  telehealth: z.boolean(),
  inPerson: z.boolean(),
  insurance: z.string(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { token, bio, telehealth, inPerson, insurance } = parsed.data;

  const claim = await prisma.therapistClaim.findUnique({ where: { token } });
  if (!claim || claim.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 410 });
  }

  const insuranceList = insurance
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.therapist.update({
    where: { id: claim.therapistId },
    data: { bio, telehealth, inPerson, insurance: insuranceList, source: "claimed" },
  });

  await prisma.therapistClaim.update({
    where: { token },
    data: { verifiedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
