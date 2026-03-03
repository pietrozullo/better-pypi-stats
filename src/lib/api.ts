import type {
  PyPIRecentDownloads,
  PyPIOverallData,
  PyPISystemData,
  PyPIPythonVersionData,
  PackageStats,
  BreakdownTimeSeries,
} from "./types";

/**
 * Convert raw {category, date, downloads}[] into a time series
 * where each entry is { date, Category1: n, Category2: n, ... }
 * Returns only the top N categories by total volume.
 */
function buildBreakdownTimeSeries(
  rawData: { category: string; date: string; downloads: number }[],
  topN: number = 6,
  formatCategory?: (cat: string) => string,
): { data: BreakdownTimeSeries; categories: string[] } {
  // Find top categories by total
  const totals = new Map<string, number>();
  for (const entry of rawData) {
    const cat = entry.category || "null";
    totals.set(cat, (totals.get(cat) || 0) + entry.downloads);
  }
  const topCats = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([cat]) => cat);

  const fmt = formatCategory || ((c: string) => c === "null" ? "Unknown" : c);

  // Build date -> { cat: downloads } map
  const dateMap = new Map<string, Record<string, number>>();
  for (const entry of rawData) {
    const cat = entry.category || "null";
    if (!topCats.includes(cat)) continue;
    if (!dateMap.has(entry.date)) dateMap.set(entry.date, {});
    const row = dateMap.get(entry.date)!;
    row[fmt(cat)] = (row[fmt(cat)] || 0) + entry.downloads;
  }

  const categories = topCats.map(fmt);
  const data = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values } as Record<string, string | number>));

  return { data, categories };
}

const PYPISTATS_BASE = "https://pypistats.org/api";

async function fetchPyPIStats<T>(path: string): Promise<T> {
  const res = await fetch(`${PYPISTATS_BASE}${path}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`PyPI Stats API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getRecentDownloads(pkg: string): Promise<PyPIRecentDownloads> {
  return fetchPyPIStats(`/packages/${encodeURIComponent(pkg)}/recent`);
}

export async function getOverallDownloads(pkg: string): Promise<PyPIOverallData> {
  return fetchPyPIStats(`/packages/${encodeURIComponent(pkg)}/overall?mirrors=false`);
}

export async function getSystemDownloads(pkg: string): Promise<PyPISystemData> {
  return fetchPyPIStats(`/packages/${encodeURIComponent(pkg)}/system`);
}

export async function getPythonVersionDownloads(pkg: string): Promise<PyPIPythonVersionData> {
  return fetchPyPIStats(`/packages/${encodeURIComponent(pkg)}/python_major`);
}

export async function getPythonMinorVersionDownloads(pkg: string): Promise<PyPIPythonVersionData> {
  return fetchPyPIStats(`/packages/${encodeURIComponent(pkg)}/python_minor`);
}

export async function getPackageStats(pkg: string): Promise<PackageStats> {
  // Try BigQuery first, fall back to pepy.tech for per-version data
  const versionPromise = import("./bigquery").then(async (bq) => {
    if (bq.hasBigQueryCredentials()) {
      return bq.getVersionDownloads(pkg, 90).catch(() => null);
    }
    // Fall back to pepy.tech
    const pepy = await import("./pepy");
    if (pepy.hasPepyKey()) {
      return pepy.getPepyVersionDownloads(pkg).catch(() => null);
    }
    return null;
  });

  const [recent, overall, system, pythonVersion, pythonMinor, versionData] = await Promise.all([
    getRecentDownloads(pkg),
    getOverallDownloads(pkg),
    getSystemDownloads(pkg),
    getPythonVersionDownloads(pkg),
    getPythonMinorVersionDownloads(pkg),
    versionPromise,
  ]);

  // Aggregate daily downloads from overall data (without mirrors)
  const dailyMap = new Map<string, number>();
  for (const entry of overall.data) {
    if (entry.category === "without_mirrors") {
      dailyMap.set(entry.date, (dailyMap.get(entry.date) || 0) + entry.downloads);
    }
  }
  const dailyDownloads = Array.from(dailyMap.entries())
    .map(([date, downloads]) => ({ date, downloads }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Aggregate system downloads
  const systemMap = new Map<string, number>();
  for (const entry of system.data) {
    const name = entry.category || "Unknown";
    systemMap.set(name, (systemMap.get(name) || 0) + entry.downloads);
  }
  const systemBreakdown = Array.from(systemMap.entries())
    .map(([name, value]) => ({
      name: name === "null" ? "Unknown" : name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
    .sort((a, b) => b.value - a.value);

  // Aggregate Python version downloads
  const pyMap = new Map<string, number>();
  for (const entry of pythonVersion.data) {
    const name = entry.category || "Unknown";
    pyMap.set(name, (pyMap.get(name) || 0) + entry.downloads);
  }
  const pythonVersionBreakdown = Array.from(pyMap.entries())
    .map(([name, value]) => ({
      name: name === "null" ? "Unknown" : `Python ${name}`,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  // Aggregate Python minor version downloads (top 10)
  const pyMinorMap = new Map<string, number>();
  for (const entry of pythonMinor.data) {
    const name = entry.category || "Unknown";
    pyMinorMap.set(name, (pyMinorMap.get(name) || 0) + entry.downloads);
  }
  const pythonMinorBreakdown = Array.from(pyMinorMap.entries())
    .map(([name, value]) => ({
      name: name === "null" ? "Unknown" : name,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Build time series breakdowns for the main chart
  const systemTimeSeries = buildBreakdownTimeSeries(
    system.data, 5,
    (c) => c === "null" ? "Unknown" : c.charAt(0).toUpperCase() + c.slice(1)
  );
  const pythonVersionTimeSeries = buildBreakdownTimeSeries(
    pythonVersion.data, 4,
    (c) => c === "null" ? "Unknown" : `Python ${c}`
  );
  const pythonMinorTimeSeries = buildBreakdownTimeSeries(
    pythonMinor.data, 6,
    (c) => c === "null" ? "Unknown" : c
  );

  // Version time series from BigQuery or pepy.tech (if available)
  const versionTimeSeries = versionData || undefined;

  return {
    name: pkg,
    recentDownloads: {
      lastDay: recent.data.last_day,
      lastWeek: recent.data.last_week,
      lastMonth: recent.data.last_month,
    },
    dailyDownloads,
    systemBreakdown,
    pythonVersionBreakdown,
    pythonMinorBreakdown,
    systemTimeSeries,
    pythonVersionTimeSeries,
    pythonMinorTimeSeries,
    versionTimeSeries,
  };
}

// Search PyPI for packages (uses PyPI JSON API)
export async function searchPackages(query: string): Promise<{ name: string; summary: string }[]> {
  if (!query || query.length < 2) return [];
  const res = await fetch(
    `https://pypi.org/simple/`,
    { next: { revalidate: 86400 } }
  );
  // PyPI simple API returns HTML, so we'll use the JSON API for search
  // Actually, PyPI deprecated XML-RPC search. We'll use a different approach.
  // Search via PyPI JSON API for a specific package
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(query)}/json`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      return [{ name: data.info.name, summary: data.info.summary || "" }];
    }
  } catch {
    // ignore
  }
  return [];
}

export interface PackageInfo {
  name: string;
  summary: string;
  version: string;
  author: string;
  license: string;
  homePage: string;
  projectUrl: string;
  versions: { version: string; date: string }[];
}

export async function getPackageInfo(pkg: string): Promise<PackageInfo | null> {
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();

    // Extract versions with their upload dates (most recent first, top 20)
    const versions: { version: string; date: string }[] = [];
    const releases = data.releases || {};
    for (const [ver, files] of Object.entries(releases)) {
      const fileList = files as { upload_time_iso_8601?: string }[];
      if (fileList.length > 0 && fileList[0].upload_time_iso_8601) {
        versions.push({
          version: ver,
          date: fileList[0].upload_time_iso_8601.split("T")[0],
        });
      }
    }
    versions.sort((a, b) => b.date.localeCompare(a.date));

    return {
      name: data.info.name,
      summary: data.info.summary || "",
      version: data.info.version,
      author: data.info.author || data.info.author_email || "",
      license: data.info.license || "",
      homePage: data.info.home_page || data.info.project_url || "",
      projectUrl: data.info.project_url || `https://pypi.org/project/${pkg}/`,
      versions: versions.slice(0, 20),
    };
  } catch {
    return null;
  }
}
