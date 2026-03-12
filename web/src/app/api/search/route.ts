import { NextRequest, NextResponse } from "next/server";
import { searchTherapists } from "@/lib/search";
import { questionnaireToQuery, type QuestionnaireData } from "@/lib/types";
import { z } from "zod";

const FreeformSchema = z.object({
  mode: z.literal("freeform"),
  location: z.string().min(2),
  query: z.string().min(10),
});

const QuestionnaireSchema = z.object({
  mode: z.literal("questionnaire"),
  location: z.string().min(2),
  questionnaire: z.object({
    primaryIssues: z.array(z.string()),
    therapyExperience: z.enum(["none", "some", "extensive"]),
    preferredModality: z.array(z.string()),
    sessionFormat: z.enum(["in-person", "telehealth", "either"]),
    insurance: z.string(),
    additionalContext: z.string(),
  }),
});

const RequestSchema = z.discriminatedUnion("mode", [
  FreeformSchema,
  QuestionnaireSchema,
]);

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const query =
    data.mode === "freeform"
      ? data.query
      : questionnaireToQuery(data.questionnaire as QuestionnaireData);

  const { results, enhancedQuery } = await searchTherapists({
    location: data.location,
    query,
    useEnhancement: true,
  });

  return NextResponse.json({ results, enhancedQuery, query });
}
