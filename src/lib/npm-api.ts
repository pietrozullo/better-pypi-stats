import type { PackageStats } from "./types";
import type { PackageInfo } from "./api";

const NPM_API = "https://api.npmjs.org";
const NPM_REGISTRY = "https://registry.npmjs.org";

async function fetchNpm<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`npm API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

interface NpmPointResponse {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

interface NpmRangeResponse {
  downloads: { day: string; downloads: number }[];
  start: string;
  end: string;
  package: string;
}

interface NpmVersionsResponse {
  package: string;
  downloads: Record<string, { version: string; downloads: number }>;
}

export async function getNpmRecentDownloads(pkg: string) {
  const [lastDay, lastWeek, lastMonth] = await Promise.all([
    fetchNpm<NpmPointResponse>(`${NPM_API}/downloads/point/last-day/${encodeURIComponent(pkg)}`),
    fetchNpm<NpmPointResponse>(`${NPM_API}/downloads/point/last-week/${encodeURIComponent(pkg)}`),
    fetchNpm<NpmPointResponse>(`${NPM_API}/downloads/point/last-month/${encodeURIComponent(pkg)}`),
  ]);
  return {
    lastDay: lastDay.downloads,
    lastWeek: lastWeek.downloads,
    lastMonth: lastMonth.downloads,
  };
}

export async function getNpmDailyDownloads(pkg: string, days: number = 365) {
  // npm API supports up to 18 months
  const cappedDays = Math.min(days, 540);
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - cappedDays);

  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const data = await fetchNpm<NpmRangeResponse>(
    `${NPM_API}/downloads/range/${startStr}:${endStr}/${encodeURIComponent(pkg)}`
  );

  return data.downloads.map((d) => ({
    date: d.day,
    downloads: d.downloads,
  }));
}

export async function getNpmVersionDownloads(pkg: string) {
  try {
    const data = await fetchNpm<NpmVersionsResponse>(
      `${NPM_API}/versions/${encodeURIComponent(pkg)}/last-week`
    );

    // Sort by downloads, get top 8
    const sorted = Object.values(data.downloads)
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 8);

    return sorted.map((v) => ({ name: v.version, value: v.downloads }));
  } catch {
    return [];
  }
}

export async function getNpmPackageInfo(pkg: string): Promise<PackageInfo | null> {
  try {
    const res = await fetch(
      `${NPM_REGISTRY}/${encodeURIComponent(pkg)}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const latest = data["dist-tags"]?.latest || "";
    const latestInfo = data.versions?.[latest] || {};

    // Extract recent versions
    const versions: { version: string; date: string }[] = [];
    const times = data.time || {};
    for (const [ver, time] of Object.entries(times)) {
      if (ver === "created" || ver === "modified") continue;
      versions.push({
        version: ver,
        date: (time as string).split("T")[0],
      });
    }
    versions.sort((a, b) => b.date.localeCompare(a.date));

    return {
      name: data.name,
      summary: data.description || "",
      version: latest,
      author: typeof data.author === "string" ? data.author : data.author?.name || "",
      license: latestInfo.license || data.license || "",
      homePage: data.homepage || "",
      projectUrl: `https://www.npmjs.com/package/${pkg}`,
      versions: versions.slice(0, 20),
    };
  } catch {
    return null;
  }
}

export async function getNpmPackageStats(pkg: string): Promise<PackageStats> {
  const [recent, daily, versionDownloads] = await Promise.all([
    getNpmRecentDownloads(pkg),
    getNpmDailyDownloads(pkg, 365),
    getNpmVersionDownloads(pkg),
  ]);

  // Build version time series from last-week data (only 7 days available from npm)
  const versionTimeSeries = versionDownloads.length > 0
    ? {
        data: [{ date: new Date().toISOString().split("T")[0], ...Object.fromEntries(versionDownloads.map(v => [v.name, v.value])) }],
        categories: versionDownloads.map(v => v.name),
      }
    : undefined;

  return {
    name: pkg,
    recentDownloads: recent,
    dailyDownloads: daily,
    // npm doesn't have OS/Python breakdowns
    systemBreakdown: [],
    pythonVersionBreakdown: [],
    pythonMinorBreakdown: [],
    systemTimeSeries: { data: [], categories: [] },
    pythonVersionTimeSeries: { data: [], categories: [] },
    pythonMinorTimeSeries: { data: [], categories: [] },
    versionTimeSeries,
  };
}
