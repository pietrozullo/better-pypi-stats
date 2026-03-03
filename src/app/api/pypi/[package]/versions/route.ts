import { NextRequest, NextResponse } from "next/server";
import { hasBigQueryCredentials, getVersionDownloads } from "@/lib/bigquery";
import { getPepyVersionDownloads, hasPepyKey } from "@/lib/pepy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ package: string }> }
) {
  const { package: pkg } = await params;
  const days = parseInt(request.nextUrl.searchParams.get("days") || "90", 10);
  const cappedDays = Math.min(days, 1095);

  try {
    if (hasBigQueryCredentials()) {
      const result = await getVersionDownloads(pkg, cappedDays);
      if (result) {
        return NextResponse.json({ available: true, source: "bigquery", ...result });
      }
    }

    if (hasPepyKey()) {
      const result = await getPepyVersionDownloads(pkg);
      if (result) {
        return NextResponse.json({ available: true, source: "pepy", ...result });
      }
    }

    return NextResponse.json({
      available: false,
      message: "No version data source configured.",
    });
  } catch {
    return NextResponse.json(
      { available: false, message: "Error fetching version data" },
      { status: 200 }
    );
  }
}
