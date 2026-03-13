import { NextRequest, NextResponse } from "next/server";
import { getInsuranceOptions } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const location = request.nextUrl.searchParams.get("location");
  if (!location) {
    return NextResponse.json({ options: [] });
  }
  const options = await getInsuranceOptions(location);
  return NextResponse.json({ options });
}
