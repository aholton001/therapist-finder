import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const claim = await prisma.therapistClaim.findUnique({
    where: { token },
    include: { therapist: true },
  });

  if (!claim) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }
  if (claim.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 410 });
  }

  return NextResponse.json({
    therapistId: claim.therapistId,
    therapist: {
      id: claim.therapist.id,
      name: claim.therapist.name,
      credentials: claim.therapist.credentials,
      bio: claim.therapist.bio,
      city: claim.therapist.city,
      state: claim.therapist.state,
      telehealth: claim.therapist.telehealth,
      inPerson: claim.therapist.inPerson,
      insurance: claim.therapist.insurance,
      specialties: claim.therapist.specialties,
    },
  });
}
