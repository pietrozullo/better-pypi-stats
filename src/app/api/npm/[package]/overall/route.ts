import { NextRequest, NextResponse } from "next/server";
import { getNpmDailyDownloads } from "@/lib/npm-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ package: string }> }
) {
  const { package: pkg } = await params;
  const days = parseInt(request.nextUrl.searchParams.get("days") || "365", 10);
  try {
    const data = await getNpmDailyDownloads(pkg, days);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: `Failed to fetch data for ${pkg}` }, { status: 500 });
  }
}
