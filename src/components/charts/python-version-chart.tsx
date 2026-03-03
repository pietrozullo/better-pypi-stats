"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, CHART_COLORS } from "@/lib/utils";
import { ChartExportWrapper, ExportButtons } from "./chart-export";
import { ChartTooltip } from "./chart-tooltip";
import { useChartColors } from "./use-chart-colors";

interface PythonVersionChartProps {
  data: { name: string; value: number }[];
  packageName?: string;
}

export function PythonVersionChart({ data, packageName = "chart" }: PythonVersionChartProps) {
  const chartColors = useChartColors();
  return (
    <ChartExportWrapper filename={`${packageName}-python-versions`}>
      <Card data-chart-card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Downloads by Python Version</CardTitle>
          <ExportButtons />
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={chartColors.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatNumber}
                  stroke={chartColors.axis}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      nameFormatter={() => "Downloads"}
                    />
                  }
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </ChartExportWrapper>
  );
}
