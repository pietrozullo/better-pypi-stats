import { NextResponse } from "next/server";
import { getNpmRecentDownloads } from "@/lib/npm-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ package: string }> }
) {
  const { package: pkg } = await params;
  try {
    const data = await getNpmRecentDownloads(pkg);
    return NextResponse.json({ data: { last_day: data.lastDay, last_week: data.lastWeek, last_month: data.lastMonth } });
  } catch {
    return NextResponse.json({ error: `Failed to fetch data for ${pkg}` }, { status: 500 });
  }
}
