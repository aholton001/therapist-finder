import { NextRequest, NextResponse } from "next/server";

const SCRAPER_URL = process.env.SCRAPER_URL ?? "http://localhost:8000";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("job_id");
  if (!jobId) {
    return NextResponse.json({ error: "Missing job_id" }, { status: 400 });
  }

  try {
    const res = await fetch(`${SCRAPER_URL}/jobs/${jobId}`);
    if (res.status === 404) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "Scraper error" }, { status: 502 });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Scraper unavailable" }, { status: 503 });
  }
}
