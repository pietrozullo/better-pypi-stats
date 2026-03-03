"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS } from "@/lib/utils";
import { ChartExportWrapper } from "./chart-export";
import { PieTooltip } from "./chart-tooltip";

interface SystemChartProps {
  data: { name: string; value: number }[];
  packageName?: string;
}

export function SystemChart({ data, packageName = "chart" }: SystemChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartExportWrapper filename={`${packageName}-os-breakdown`}>
      <Card data-chart-card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Downloads by OS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip total={total} />} />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </ChartExportWrapper>
  );
}
