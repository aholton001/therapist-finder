import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RequestSchema = z.object({
  userQuery: z.string().min(1),
  therapist: z.object({
    name: z.string(),
    bio: z.string().nullable(),
    specialties: z.array(z.string()),
    issues: z.array(z.string()),
    therapyTypes: z.array(z.string()),
  }),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { userQuery, therapist } = parsed.data;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    system: `You explain in 1-2 sentences why a specific therapist is a good match for a patient.

Rules:
- Be specific — reference actual words from the therapist's bio or specialties that connect to the patient's situation
- Never be generic ("they have experience with many issues")
- Write in second person ("This therapist..." not "You...")
- Keep it to 1-2 sentences, max 60 words
- If there's a weak match, be honest but find the strongest connection available`,
    messages: [
      {
        role: "user",
        content: `Patient's situation: ${userQuery}

Therapist: ${therapist.name}
Bio: ${therapist.bio ?? "Not provided"}
Specialties: ${therapist.specialties.join(", ") || "None listed"}
Issues treated: ${therapist.issues.join(", ") || "None listed"}
Therapy approaches: ${therapist.therapyTypes.join(", ") || "None listed"}

Why is this therapist a good match?`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  return NextResponse.json({ explanation: content.text });
}
