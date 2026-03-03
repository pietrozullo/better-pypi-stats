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
    color: string;
    dailyDownloads: { date: string; downloads: number }[];
  }[];
}

export function CompareChart({ packages }: CompareChartProps) {
  const [normalized, setNormalized] = useState(false);
  const [smoothed, setSmoothed] = useState(true);
  const chartColors = useChartColors();

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

        point[pkg.name] = value;
      });
      return point;
    });
  }, [packages, normalized, smoothed]);

  const exportFilename = `compare-${packages.map((p) => p.name).join("-vs-")}`;

  return (
    <ChartExportWrapper filename={exportFilename}>
      <Card data-chart-card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Download Comparison</CardTitle>
          <div className="flex items-center gap-1">
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
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
                />
                <Tooltip
                  content={
                    <DateTooltip
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
                    key={pkg.name}
                    type="monotone"
                    dataKey={pkg.name}
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
