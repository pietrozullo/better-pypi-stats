import { NextResponse } from "next/server";
import { getRecentDownloads } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ package: string }> }
) {
  const { package: pkg } = await params;
  try {
    const data = await getRecentDownloads(pkg);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: `Failed to fetch data for ${pkg}` },
      { status: 500 }
    );
  }
}
