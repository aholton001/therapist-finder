import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RequestSchema = z.object({
  userQuery: z.string().min(1),
  therapist: z.object({
    name: z.string(),
    credentials: z.string().nullable(),
    bio: z.string().nullable(),
    specialties: z.array(z.string()),
    therapyTypes: z.array(z.string()),
    city: z.string().nullable(),
    state: z.string().nullable(),
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

  const therapistContext = [
    `Name: ${therapist.name}${therapist.credentials ? `, ${therapist.credentials}` : ""}`,
    therapist.city && therapist.state ? `Location: ${therapist.city}, ${therapist.state}` : null,
    therapist.bio ? `Their bio: "${therapist.bio}"` : null,
    therapist.specialties.length ? `Specialties: ${therapist.specialties.slice(0, 5).join(", ")}` : null,
    therapist.therapyTypes.length ? `Approaches: ${therapist.therapyTypes.slice(0, 4).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: `You write warm, concise first-contact emails from a patient to a therapist.

Rules:
- 3-4 short paragraphs, no more than 150 words total
- First paragraph: briefly introduce yourself and what brings you to therapy (from the user's description)
- Second paragraph: 1-2 specific reasons why this therapist caught your attention — reference something real from their bio or specialties, not generic flattery
- Third paragraph: a simple ask (brief phone/video consultation, or whether they're accepting new clients)
- Sign off as "A prospective client"
- Warm but not overly effusive. Professional but human.
- Do NOT invent details not present in the input`,
    messages: [
      {
        role: "user",
        content: `Write an intro email from this person:\n\n${userQuery}\n\n---\nTo this therapist:\n\n${therapistContext}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  return NextResponse.json({ message: content.text });
}
