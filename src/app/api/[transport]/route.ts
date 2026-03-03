import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getPackageStats, getPackageInfo } from "@/lib/api";
import { getNpmPackageStats, getNpmPackageInfo } from "@/lib/npm-api";

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "get_package_stats",
      "Get download statistics for a PyPI or npm package including recent downloads, daily trends, and breakdowns",
      {
        registry: z.enum(["pypi", "npm"]).describe("Package registry"),
        package_name: z.string().describe("Package name"),
      },
      async ({ registry, package_name }) => {
        try {
          const stats = registry === "npm"
            ? await getNpmPackageStats(package_name)
            : await getPackageStats(package_name);
          const info = registry === "npm"
            ? await getNpmPackageInfo(package_name)
            : await getPackageInfo(package_name);

          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                name: stats.name,
                registry,
                version: info?.version,
                summary: info?.summary,
                downloads: {
                  last_day: stats.recentDownloads.lastDay,
                  last_week: stats.recentDownloads.lastWeek,
                  last_month: stats.recentDownloads.lastMonth,
                },
                daily_downloads_last_30d: stats.dailyDownloads.slice(-30),
                ...(registry === "pypi" ? {
                  os_breakdown: stats.systemBreakdown,
                  python_version_breakdown: stats.pythonVersionBreakdown,
                } : {}),
              }, null, 2),
            }],
          };
        } catch {
          return {
            content: [{ type: "text" as const, text: `Error: Package "${package_name}" not found on ${registry}` }],
            isError: true,
          };
        }
      }
    );

    server.tool(
      "compare_packages",
      "Compare download statistics across multiple PyPI and/or npm packages",
      {
        packages: z.array(z.object({
          registry: z.enum(["pypi", "npm"]),
          name: z.string(),
        })).min(2).max(5).describe("List of packages to compare"),
      },
      async ({ packages }) => {
        try {
          const results = await Promise.all(
            packages.map(async (pkg) => {
              const stats = pkg.registry === "npm"
                ? await getNpmPackageStats(pkg.name)
                : await getPackageStats(pkg.name);
              return {
                name: pkg.name,
                registry: pkg.registry,
                last_day: stats.recentDownloads.lastDay,
                last_week: stats.recentDownloads.lastWeek,
                last_month: stats.recentDownloads.lastMonth,
                avg_daily_30d: Math.round(
                  stats.dailyDownloads.slice(-30).reduce((s, d) => s + d.downloads, 0) /
                  Math.max(stats.dailyDownloads.slice(-30).length, 1)
                ),
              };
            })
          );

          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ comparison: results }, null, 2),
            }],
          };
        } catch (e) {
          return {
            content: [{ type: "text" as const, text: `Error comparing packages: ${e instanceof Error ? e.message : "Unknown error"}` }],
            isError: true,
          };
        }
      }
    );

    server.tool(
      "get_package_info",
      "Get metadata about a package including version, author, license, and recent releases",
      {
        registry: z.enum(["pypi", "npm"]).describe("Package registry"),
        package_name: z.string().describe("Package name"),
      },
      async ({ registry, package_name }) => {
        try {
          const info = registry === "npm"
            ? await getNpmPackageInfo(package_name)
            : await getPackageInfo(package_name);

          if (!info) {
            return {
              content: [{ type: "text" as const, text: `Package "${package_name}" not found on ${registry}` }],
              isError: true,
            };
          }

          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(info, null, 2),
            }],
          };
        } catch (e) {
          return {
            content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : "Unknown error"}` }],
            isError: true,
          };
        }
      }
    );
  },
  {},
  {
    basePath: "/api",
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
