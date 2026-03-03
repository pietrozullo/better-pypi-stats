"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber, formatDateShort, CHART_COLORS, aggregateBreakdownByGranularity } from "@/lib/utils";
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
  const chartColors = useChartColors();

  const hasNameCollision = useMemo(() => {
    const names = packages.map((p) => p.name);
    return names.length !== new Set(names).size;
  }, [packages]);

  const getLabel = (pkg: { name: string; registry?: string }) =>
    hasNameCollision ? displayKey(pkg) : pkg.name;

  const labels = useMemo(() => packages.map(getLabel), [packages, getLabel]);

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

        if (smoothed) {
          const idx = pkg.dailyDownloads.findIndex((d) => d.date === date);
          if (idx >= 0) {
            const window = granularity === "day" ? 7 : granularity === "week" ? 4 : 3;
            const start = Math.max(0, idx - window + 1);
            const slice = pkg.dailyDownloads.slice(start, idx + 1);
            value = Math.round(
              slice.reduce((sum, d) => sum + d.downloads, 0) / slice.length
            );
          }
        }

        if (normalized) {
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
    if (granularity !== "day") {
      return aggregateBreakdownByGranularity(rawData, labels, granularity);
    }
    return rawData;
  }, [packages, normalized, smoothed, dateRange, granularity, getLabel, labels]);

  const exportFilename = `compare-${packages.map((p) => p.name).join("-vs-")}`;

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
            >
              Smooth
            </Button>
            <Button
              variant={normalized ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setNormalized(!normalized)}
              className="text-xs h-7"
            >
              Normalize
            </Button>
            <div className="flex items-center rounded-md border border-border">
              {(["day", "week", "month"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-2 py-1 text-xs transition-colors ${
                    granularity === g
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g === "day" ? "D" : g === "week" ? "W" : "M"}
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
                  tickFormatter={formatDateShort}
                  stroke={chartColors.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={(v) => normalized ? `${v}%` : formatNumber(v)}
                  stroke={chartColors.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                />
                <Tooltip
                  content={
                    <DateTooltip
                      sortByValue
                      valueFormatter={(value) =>
                        normalized ? `${value}%` : formatNumber(value)
                      }
                    />
                  }
                />
                <Legend
                  formatter={(value: string) => (
                    <span className="text-xs">{value}</span>
                  )}
                />
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
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </ChartExportWrapper>
  );
}
