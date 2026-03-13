import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

const SYSTEM_PROMPT = `You are a clinical intake specialist helping match patients to therapists.

Given a patient's self-description, rewrite it as a rich paragraph in clinical language that mirrors how therapists describe the clients they work with. This helps match the patient's needs to therapist bios.

Rules:
- Translate lay terms to clinical equivalents (e.g. "feeling down" → depression, "relationship problems" → interpersonal conflict, couples issues)
- Preserve all specific details (trauma history, relationship status, career stress, etc.)
- Include implicit preferences if detectable (e.g. mentions a breakup → likely needs individual therapy, not couples)
- Keep it to 2-4 sentences
- Do NOT add information not present in the input
- Return ONLY the rewritten paragraph, no preamble`;

export async function enhanceQuery(rawQuery: string): Promise<string> {
  try {
    const message = await getAnthropic().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: rawQuery }],
    });

    const content = message.content[0];
    if (content.type === "text") return content.text;
    return rawQuery;
  } catch {
    // Fall back to raw query if Claude is unavailable
    return rawQuery;
  }
}
