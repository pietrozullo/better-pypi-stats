import type { BreakdownTimeSeries } from "./types";

let bqClient: InstanceType<typeof import("@google-cloud/bigquery").BigQuery> | null = null;

async function getClient() {
  if (bqClient) return bqClient;

  const { BigQuery } = await import("@google-cloud/bigquery");

  // Support credentials via env var (JSON string) or GOOGLE_APPLICATION_CREDENTIALS file path
  const credentialsJson = process.env.BIGQUERY_CREDENTIALS;
  if (credentialsJson) {
    const credentials = JSON.parse(credentialsJson);
    bqClient = new BigQuery({
      projectId: credentials.project_id,
      credentials,
    });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var (file path)
    bqClient = new BigQuery();
  }

  return bqClient;
}

export function hasBigQueryCredentials(): boolean {
  return !!(process.env.BIGQUERY_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

/**
 * Get daily downloads broken down by package version for the last N days.
 * Uses partition pruning on timestamp to minimize bytes scanned.
 * Only returns top 8 versions by volume.
 */
export async function getVersionDownloads(
  pkg: string,
  days: number = 90,
  excludeUv: boolean = false
): Promise<{ data: BreakdownTimeSeries; categories: string[] } | null> {
  if (!hasBigQueryCredentials()) return null;

  try {
    const client = await getClient();

    // Optional filter: exclude uv resolver downloads when requested
    const INSTALLER_FILTER = excludeUv
      ? `AND (details.installer.name IS NULL OR details.installer.name != 'uv')`
      : "";

    // Step 1: Find top versions by combining:
    //   - Top 5 by total downloads over the full period (established versions)
    //   - Top 5 by downloads in the last 7 days (catches newly released versions)
    const [topVersionsResult] = await client.query({
      query: `
        WITH overall_top AS (
          SELECT file.version as version, COUNT(*) as total
          FROM \`bigquery-public-data.pypi.file_downloads\`
          WHERE file.project = @project
            AND DATE(timestamp) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY) AND CURRENT_DATE()
            ${INSTALLER_FILTER}
          GROUP BY version
          ORDER BY total DESC
          LIMIT 5
        ),
        recent_top AS (
          SELECT file.version as version, COUNT(*) as total
          FROM \`bigquery-public-data.pypi.file_downloads\`
          WHERE file.project = @project
            AND DATE(timestamp) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) AND CURRENT_DATE()
            ${INSTALLER_FILTER}
          GROUP BY version
          ORDER BY total DESC
          LIMIT 5
        )
        SELECT DISTINCT version FROM (
          SELECT version FROM overall_top
          UNION DISTINCT
          SELECT version FROM recent_top
        )
      `,
      params: { project: pkg, days },
      types: { project: "STRING", days: "INT64" },
    });

    if (!topVersionsResult || topVersionsResult.length === 0) return null;

    const topVersions = topVersionsResult.map(
      (row: { version: string }) => row.version
    );

    // Step 2: Get daily breakdown for only these versions
    const [dailyResult] = await client.query({
      query: `
        SELECT
          FORMAT_DATE('%Y-%m-%d', DATE(timestamp)) as date,
          file.version as version,
          COUNT(*) as downloads
        FROM \`bigquery-public-data.pypi.file_downloads\`
        WHERE file.project = @project
          AND DATE(timestamp) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY) AND CURRENT_DATE()
          AND file.version IN UNNEST(@versions)
          ${INSTALLER_FILTER}
        GROUP BY date, version
        ORDER BY date
      `,
      params: { project: pkg, days, versions: topVersions },
      types: { project: "STRING", days: "INT64", versions: ["STRING"] },
    });

    if (!dailyResult || dailyResult.length === 0) return null;

    // Build time series
    const dateMap = new Map<string, Record<string, number>>();
    for (const row of dailyResult as { date: string; version: string; downloads: number }[]) {
      if (!dateMap.has(row.date)) dateMap.set(row.date, {});
      const point = dateMap.get(row.date)!;
      point[row.version] = Number(row.downloads);
    }

    const data: BreakdownTimeSeries = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, versions]) => {
        const point: Record<string, string | number> = { date };
        for (const ver of topVersions) {
          point[ver] = versions[ver] || 0;
        }
        return point;
      });

    return { data, categories: topVersions };
  } catch (err) {
    console.error("BigQuery version downloads error:", err);
    return null;
  }
}

/**
 * Get daily total downloads for a package over a long time range.
 * Used to extend beyond pypistats.org's 180-day limit.
 */
export async function getOverallDownloads(
  pkg: string,
  days: number = 365,
  excludeUv: boolean = false
): Promise<{ date: string; downloads: number }[] | null> {
  if (!hasBigQueryCredentials()) return null;

  try {
    const client = await getClient();
    const INSTALLER_FILTER = excludeUv
      ? `AND (details.installer.name IS NULL OR details.installer.name != 'uv')`
      : "";

    const [result] = await client.query({
      query: `
        SELECT
          FORMAT_DATE('%Y-%m-%d', DATE(timestamp)) as date,
          COUNT(*) as downloads
        FROM \`bigquery-public-data.pypi.file_downloads\`
        WHERE file.project = @project
          AND DATE(timestamp) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY) AND CURRENT_DATE()
          ${INSTALLER_FILTER}
        GROUP BY date
        ORDER BY date
      `,
      params: { project: pkg, days },
      types: { project: "STRING", days: "INT64" },
    });

    if (!result || result.length === 0) return null;

    return result.map((row: { date: string; downloads: number }) => ({
      date: row.date,
      downloads: Number(row.downloads),
    }));
  } catch (err) {
    console.error("BigQuery overall downloads error:", err);
    return null;
  }
}
