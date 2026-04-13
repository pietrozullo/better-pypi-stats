"use client";

import { useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatNumber,
  formatPercentChange,
  formatDateForGranularity,
  aggregateBreakdownByGranularity,
  calculateBreakdownGrowthByPeriod,
  projectPartialBucket,
} from "@/lib/utils";
import type { Granularity } from "@/lib/utils";
import { ChartExportWrapper, ExportButtons } from "./chart-export";
import { DateTooltip } from "./chart-tooltip";
import { useChartColors } from "./use-chart-colors";

interface CompareChartProps {
  packages: {
    name: string;
    registry?: "pypi" | "npm";
    color: string;
    dailyDownloads: { date: string; downloads: number }[];
  }[];
}

const DATE_RANGES = [
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "180D", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: 9999 },
];

function displayKey(pkg: { name: string; registry?: string }): string {
  return pkg.registry ? `${pkg.registry}:${pkg.name}` : pkg.name;
}

export function CompareChart({ packages }: CompareChartProps) {
  const [normalized, setNormalized] = useState(false);
  const [smoothed, setSmoothed] = useState(true);
  const [dateRange, setDateRange] = useState(180);
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [growthMode, setGrowthMode] = useState(false);
  const chartColors = useChartColors();

  const hasNameCollision = useMemo(() => {
    const names = packages.map((p) => p.name);
    return names.length !== new Set(names).size;
  }, [packages]);

  const getLabel = useCallback(
    (pkg: { name: string; registry?: string }) =>
      hasNameCollision ? displayKey(pkg) : pkg.name,
    [hasNameCollision]
  );

  const labels = useMemo(() => packages.map(getLabel), [packages, getLabel]);

  function toggleGrowthMode() {
    setGrowthMode((prev) => {
      const next = !prev;
      if (next) {
        setSmoothed(false);
        setNormalized(false);
      }
      return next;
    });
  }

  const chartData = useMemo(() => {
    if (packages.length === 0) return [];

    // Build raw daily data
    const allDates = new Set<string>();
    packages.forEach((pkg) => {
      pkg.dailyDownloads.forEach((d) => allDates.add(d.date));
    });

    const sortedDates = Array.from(allDates).sort();

    // Apply date range filter
    const cutoff = sortedDates.length - dateRange;
    const filteredDates = sortedDates.slice(Math.max(0, cutoff));

    const rawData = filteredDates.map((date) => {
      const point: Record<string, string | number> = { date };
      packages.forEach((pkg) => {
        const label = getLabel(pkg);
        const entry = pkg.dailyDownloads.find((d) => d.date === date);
        let value = entry?.downloads || 0;

        if (!growthMode && smoothed) {
          const idx = pkg.dailyDownloads.findIndex((d) => d.date === date);
          if (idx >= 0) {
            const window = granularity === "day" ? 7 : granularity === "week" ? 4 : granularity === "month" ? 3 : 2;
            const start = Math.max(0, idx - window + 1);
            const slice = pkg.dailyDownloads.slice(start, idx + 1);
            value = Math.round(
              slice.reduce((sum, d) => sum + d.downloads, 0) / slice.length
            );
          }
        }

        if (!growthMode && normalized) {
          const max = Math.max(
            ...pkg.dailyDownloads.map((d) => d.downloads),
            1
          );
          value = Math.round((value / max) * 100);
        }

        point[label] = value;
      });
      return point;
    });

    // Apply granularity aggregation
    let series: Record<string, string | number | null>[];
    if (granularity !== "day") {
      const aggregated = aggregateBreakdownByGranularity(rawData, labels, granularity);
      series = growthMode ? calculateBreakdownGrowthByPeriod(aggregated, labels) : aggregated;
    } else {
      series = growthMode ? calculateBreakdownGrowthByPeriod(rawData, labels) : rawData;
    }

    // Per-package linear-extrapolation projection for the trailing partial bucket.
    // Suppressed in growth/normalized modes — projection isn't meaningful there.
    if (!growthMode && !normalized && series.length >= 2) {
      const lastIdx = series.length - 1;
      packages.forEach((pkg) => {
        const label = getLabel(pkg);
        const latest = pkg.dailyDownloads.length
          ? pkg.dailyDownloads[pkg.dailyDownloads.length - 1].date
          : null;
        if (!latest) return;
        // Re-aggregate this package alone to get its own bucketed series for projection.
        const pkgAgg =
          granularity === "day"
            ? pkg.dailyDownloads
            : aggregateBreakdownByGranularity(
                pkg.dailyDownloads.map((d) => ({ date: d.date, [label]: d.downloads })),
                [label],
                granularity
              ).map((r) => ({ date: String(r.date), downloads: Number(r[label] || 0) }));
        const proj = projectPartialBucket(pkgAgg, granularity, latest);
        if (!proj) return;
        const dashedKey = `${label}__dashed`;
        const projKey = `${label}__projection`;
        series.forEach((row, i) => {
          // Carry actual values across the entire range so monotone interpolation
          // produces a smooth curve; the solid line on top hides this everywhere
          // except the final segment (where we null the main series).
          row[dashedKey] = row[label] as number;
          row[projKey] = i === lastIdx ? proj.projected : null;
          if (i === lastIdx) row[label] = null;
        });
      });
    }
    return series;
  }, [packages, normalized, smoothed, dateRange, granularity, growthMode, getLabel, labels]);

  const showProjection = !growthMode && !normalized && granularity !== "day";

  const exportFilename = `compare-${packages.map((p) => p.name).join("-vs-")}${growthMode ? "-growth" : ""}`;

  return (
    <ChartExportWrapper filename={exportFilename}>
      <Card data-chart-card>
        <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">Download Comparison</CardTitle>
          <div className="flex flex-wrap items-center gap-1" data-export-hide>
            <Button
              variant={smoothed ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSmoothed(!smoothed)}
              className="text-xs h-7"
              disabled={growthMode}
            >
              Smooth
            </Button>
            <Button
              variant={normalized ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setNormalized(!normalized)}
              className="text-xs h-7"
              disabled={growthMode}
            >
              Normalize
            </Button>
            <Button
              variant={growthMode ? "secondary" : "ghost"}
              size="sm"
              onClick={toggleGrowthMode}
              className="text-xs h-7"
            >
              Growth
            </Button>
            <div className="flex items-center rounded-md border border-border">
              {(["day", "week", "month", "year"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-2 py-1 text-xs transition-colors ${
                    granularity === g
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g === "day" ? "D" : g === "week" ? "W" : g === "month" ? "M" : "Y"}
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-md border border-border">
              {DATE_RANGES.map((range) => (
                <button
                  key={range.days}
                  onClick={() => setDateRange(range.days)}
                  className={`px-2 py-1 text-xs transition-colors ${
                    dateRange === range.days
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <ExportButtons />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatDateForGranularity(value, granularity)}
                  stroke={chartColors.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={(value) => growthMode ? formatPercentChange(value, 0) : normalized ? `${value}%` : formatNumber(value)}
                  stroke={chartColors.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={growthMode ? 68 : 55}
                />
                {growthMode && <ReferenceLine y={0} stroke={chartColors.axis} strokeDasharray="4 4" />}
                <Tooltip
                  content={
                    <DateTooltip
                      granularity={granularity}
                      growthMode={growthMode}
                      sortByValue
                      nameFormatter={(name) =>
                        name.endsWith("__projection")
                          ? `${name.slice(0, -"__projection".length)} (projected)`
                          : name.endsWith("__dashed")
                            ? name.slice(0, -"__dashed".length)
                            : name
                      }
                      valueFormatter={(value) =>
                        growthMode ? formatPercentChange(value) : normalized ? `${value}%` : value == null ? "n/a" : formatNumber(value)
                      }
                    />
                  }
                />
                <Legend
                  formatter={(value: string) => (
                    <span className="text-xs">{value}</span>
                  )}
                />
                {showProjection &&
                  packages.map((pkg) => (
                    <Line
                      key={`${displayKey(pkg)}__dashed`}
                      type="monotone"
                      dataKey={`${getLabel(pkg)}__dashed`}
                      stroke={pkg.color}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      activeDot={false}
                      legendType="none"
                      tooltipType="none"
                      isAnimationActive={false}
                    />
                  ))}
                {packages.map((pkg) => (
                  <Line
                    key={displayKey(pkg)}
                    type="monotone"
                    dataKey={getLabel(pkg)}
                    stroke={pkg.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                ))}
                {showProjection &&
                  packages.map((pkg) => (
                    <Line
                      key={`${displayKey(pkg)}__projection`}
                      type="monotone"
                      dataKey={`${getLabel(pkg)}__projection`}
                      stroke="none"
                      dot={{ r: 3.5, fill: pkg.color, strokeWidth: 0 }}
                      activeDot={{ r: 4.5, fill: pkg.color }}
                      legendType="none"
                      isAnimationActive={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </ChartExportWrapper>
  );
}
