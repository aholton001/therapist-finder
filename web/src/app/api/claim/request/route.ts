import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const RequestSchema = z.object({
  therapistId: z.string(),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { therapistId, email } = parsed.data;

  const therapist = await prisma.therapist.findUnique({ where: { id: therapistId } });
  if (!therapist) {
    return NextResponse.json({ error: "Therapist not found" }, { status: 404 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

  await prisma.therapistClaim.upsert({
    where: { therapistId },
    create: { therapistId, email, token, expiresAt },
    update: { email, token, expiresAt, verifiedAt: null },
  });

  const claimUrl = `${APP_URL}/claim/edit?token=${token}`;

  await resend.emails.send({
    from: "TherapistFinder <noreply@resend.dev>",
    to: email,
    subject: "Claim your TherapistFinder profile",
    html: `
      <p>Hi ${therapist.name},</p>
      <p>Click the link below to claim and edit your TherapistFinder profile. This link expires in 24 hours.</p>
      <p><a href="${claimUrl}" style="background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Claim my profile</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
