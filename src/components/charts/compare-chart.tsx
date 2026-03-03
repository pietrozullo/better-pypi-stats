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
import { formatNumber, formatDateShort, CHART_COLORS } from "@/lib/utils";
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

function displayKey(pkg: { name: string; registry?: string }): string {
  // If multiple packages have the same name, prefix with registry
  return pkg.registry ? `${pkg.registry}:${pkg.name}` : pkg.name;
}

export function CompareChart({ packages }: CompareChartProps) {
  const [normalized, setNormalized] = useState(false);
  const [smoothed, setSmoothed] = useState(true);
  const chartColors = useChartColors();

  // Check if any names collide (same name, different registry)
  const hasNameCollision = useMemo(() => {
    const names = packages.map((p) => p.name);
    return names.length !== new Set(names).size;
  }, [packages]);

  // Use registry:name only when there's a collision, otherwise just name
  const getLabel = (pkg: { name: string; registry?: string }) =>
    hasNameCollision ? displayKey(pkg) : pkg.name;

  const chartData = useMemo(() => {
    if (packages.length === 0) return [];

    const allDates = new Set<string>();
    packages.forEach((pkg) => {
      pkg.dailyDownloads.forEach((d) => allDates.add(d.date));
    });

    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map((date) => {
      const point: Record<string, string | number> = { date };
      packages.forEach((pkg) => {
        const entry = pkg.dailyDownloads.find((d) => d.date === date);
        let value = entry?.downloads || 0;

        if (smoothed) {
          const idx = pkg.dailyDownloads.findIndex((d) => d.date === date);
          if (idx >= 0) {
            const start = Math.max(0, idx - 6);
            const window = pkg.dailyDownloads.slice(start, idx + 1);
            value = Math.round(
              window.reduce((sum, d) => sum + d.downloads, 0) / window.length
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

        point[getLabel(pkg)] = value;
      });
      return point;
    });
  }, [packages, normalized, smoothed, getLabel]);

  const exportFilename = `compare-${packages.map((p) => p.name).join("-vs-")}`;

  return (
    <ChartExportWrapper filename={exportFilename}>
      <Card data-chart-card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Download Comparison</CardTitle>
          <div className="flex items-center gap-1" data-export-hide>
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
