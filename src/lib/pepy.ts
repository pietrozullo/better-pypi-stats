import type { BreakdownTimeSeries } from "./types";

const PEPY_API_BASE = "https://api.pepy.tech/api/v2";

interface PepyProjectResponse {
  id: string;
  total_downloads: number;
  versions: string[];
  downloads: Record<string, Record<string, number>>;
  // downloads is { "2024-01-15": { "1.0.0": 5000, "1.1.0": 3000 }, ... }
}

export function hasPepyKey(): boolean {
  return !!process.env.PEPY_API_KEY;
}

export async function getPepyVersionDownloads(
  pkg: string
): Promise<{ data: BreakdownTimeSeries; categories: string[] } | null> {
  const apiKey = process.env.PEPY_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${PEPY_API_BASE}/projects/${encodeURIComponent(pkg)}`, {
      headers: { "X-Api-Key": apiKey },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const project: PepyProjectResponse = await res.json();

    // Find the top versions by total downloads across all dates
    const versionTotals = new Map<string, number>();
    for (const [, versions] of Object.entries(project.downloads)) {
      for (const [version, count] of Object.entries(versions)) {
        versionTotals.set(version, (versionTotals.get(version) || 0) + count);
      }
    }

    // Top 8 versions
    const topVersions = Array.from(versionTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([v]) => v);

    // Build time series
    const data: BreakdownTimeSeries = Object.entries(project.downloads)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, versions]) => {
        const point: Record<string, string | number> = { date };
        for (const ver of topVersions) {
          point[ver] = versions[ver] || 0;
        }
        return point;
      });

    return { data, categories: topVersions };
  } catch {
    return null;
  }
}
