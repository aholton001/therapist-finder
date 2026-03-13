import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SCRAPER_URL = process.env.SCRAPER_URL ?? "http://localhost:8000";

const RequestSchema = z.object({
  state: z.string().min(2).max(2),
  city: z.string().min(1),
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

  try {
    const res = await fetch(`${SCRAPER_URL}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Scraper error" }, { status: 502 });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Scraper unavailable" }, { status: 503 });
  }
}
