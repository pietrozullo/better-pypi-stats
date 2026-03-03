"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Download, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DownloadChart } from "@/components/charts/download-chart";
import { SystemChart } from "@/components/charts/system-chart";
import { PythonVersionChart } from "@/components/charts/python-version-chart";
import { PythonMinorChart } from "@/components/charts/python-minor-chart";
import { VersionList } from "@/components/package/version-list";
import { formatNumber } from "@/lib/utils";
import type { PackageStats } from "@/lib/types";
import type { PackageInfo } from "@/lib/api";

interface PackageViewProps {
  stats: PackageStats;
  info: PackageInfo | null;
  registry?: "pypi" | "npm";
  crossRegistryDownloads?: { date: string; downloads: number }[];
  crossRegistryName?: string;
}

export function PackageView({ stats, info, registry = "pypi", crossRegistryDownloads, crossRegistryName }: PackageViewProps) {
  const isPyPI = registry === "pypi";
  const otherRegistry = isPyPI ? "npm" : "pypi";
  // Calculate trend (compare last 7 days vs previous 7 days)
  const recent7 = stats.dailyDownloads.slice(-7);
  const prev7 = stats.dailyDownloads.slice(-14, -7);
  const recent7Total = recent7.reduce((s, d) => s + d.downloads, 0);
  const prev7Total = prev7.reduce((s, d) => s + d.downloads, 0);
  const trendPct = prev7Total > 0
    ? ((recent7Total - prev7Total) / prev7Total) * 100
    : 0;
  const isUp = trendPct >= 0;

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to search
      </Link>

      {/* Package Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{stats.name}</h1>
            {info?.summary && (
              <p className="mt-1 text-muted-foreground">{info.summary}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={isPyPI ? "secondary" : "outline"} className="text-xs">
                {isPyPI ? "PyPI" : "npm"}
              </Badge>
              {info?.version && (
                <Badge variant="outline">v{info.version}</Badge>
              )}
              {info?.license && (
                <Badge variant="secondary">{info.license}</Badge>
              )}
              {info?.author && (
                <span className="text-xs text-muted-foreground">
                  by {info.author}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/compare?packages=${registry}:${stats.name}`}>
                Compare
              </Link>
            </Button>
            {info?.projectUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={info.projectUrl} target="_blank" rel="noopener noreferrer">
                  {isPyPI ? "PyPI" : "npm"} <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Download className="h-3.5 w-3.5" />
              <span className="text-xs">Last Day</span>
            </div>
            <div className="mt-1 text-2xl font-bold">
              {formatNumber(stats.recentDownloads.lastDay)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">Last Week</span>
            </div>
            <div className="mt-1 text-2xl font-bold">
              {formatNumber(stats.recentDownloads.lastWeek)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">Last Month</span>
            </div>
            <div className="mt-1 text-2xl font-bold">
              {formatNumber(stats.recentDownloads.lastMonth)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              {isUp ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className="text-xs">7D Trend</span>
            </div>
            <div className={`mt-1 text-2xl font-bold ${isUp ? "text-success" : "text-destructive"}`}>
              {isUp ? "+" : ""}{trendPct.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <div className="mb-6">
        <DownloadChart
          data={stats.dailyDownloads}
          packageName={stats.name}
          breakdowns={[
            // Cross-registry breakdown (if package exists on both)
            ...(crossRegistryDownloads && crossRegistryDownloads.length > 0
              ? [{
                  label: "Registry",
                  key: "registry",
                  mode: "lines" as const,
                  ...(() => {
                    // Merge both registries into a single time series
                    const currentLabel = isPyPI ? "PyPI" : "npm";
                    const otherLabel = isPyPI ? "npm" : "PyPI";
                    const allDates = new Set<string>();
                    stats.dailyDownloads.forEach((d) => allDates.add(d.date));
                    crossRegistryDownloads.forEach((d) => allDates.add(d.date));
                    const currentMap = new Map(stats.dailyDownloads.map((d) => [d.date, d.downloads]));
                    const otherMap = new Map(crossRegistryDownloads.map((d) => [d.date, d.downloads]));
                    const data = Array.from(allDates)
                      .sort()
                      .map((date) => ({
                        date,
                        [currentLabel]: currentMap.get(date) || 0,
                        [otherLabel]: otherMap.get(date) || 0,
                      }));
                    return { data, categories: [currentLabel, otherLabel] };
                  })(),
                }]
              : []),
            ...(stats.versionTimeSeries
              ? [{
                  label: "Version",
                  key: "version",
                  data: stats.versionTimeSeries.data,
                  categories: stats.versionTimeSeries.categories,
                  mode: "lines" as const,
                }]
              : []),
            ...(isPyPI ? [
              {
                label: "OS",
                key: "os",
                data: stats.systemTimeSeries.data,
                categories: stats.systemTimeSeries.categories,
              },
              {
                label: "Python",
                key: "python",
                data: stats.pythonVersionTimeSeries.data,
                categories: stats.pythonVersionTimeSeries.categories,
              },
              {
                label: "Py Minor",
                key: "pyminor",
                data: stats.pythonMinorTimeSeries.data,
                categories: stats.pythonMinorTimeSeries.categories,
              },
            ] : []),
          ]}
        />
      </div>

      {/* Breakdown Charts - Row 1: OS + Python Major (PyPI only) */}
      {isPyPI && stats.systemBreakdown.length > 0 && (
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <SystemChart data={stats.systemBreakdown} packageName={stats.name} />
          <PythonVersionChart data={stats.pythonVersionBreakdown} packageName={stats.name} />
        </div>
      )}

      {/* Breakdown Charts - Row 2: Python Minor + Versions */}
      <div className="grid gap-6 md:grid-cols-2">
        {isPyPI && stats.pythonMinorBreakdown.length > 0 && (
          <PythonMinorChart data={stats.pythonMinorBreakdown} packageName={stats.name} />
        )}
        {info?.versions && info.versions.length > 0 && (
          <VersionList versions={info.versions} currentVersion={info.version} />
        )}
      </div>
    </div>
  );
}
