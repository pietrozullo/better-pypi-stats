import { NextRequest, NextResponse } from "next/server";
import { hasBigQueryCredentials, getOverallDownloads } from "@/lib/bigquery";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ package: string }> }
) {
  const { package: pkg } = await params;
  const days = parseInt(request.nextUrl.searchParams.get("days") || "365", 10);
  const excludeUv = request.nextUrl.searchParams.get("excludeUv") === "true";

  if (!hasBigQueryCredentials()) {
    return NextResponse.json(
      { available: false, message: "BigQuery not configured" },
      { status: 200 }
    );
  }

  // Cap at 3 years to avoid expensive queries
  const cappedDays = Math.min(days, 1095);

  try {
    const data = await getOverallDownloads(pkg, cappedDays, excludeUv);
    if (!data) {
      return NextResponse.json(
        { available: false, message: "No data found" },
        { status: 200 }
      );
    }
    return NextResponse.json({ available: true, data });
  } catch {
    return NextResponse.json(
      { available: false, message: "Error fetching data" },
      { status: 200 }
    );
  }
}
