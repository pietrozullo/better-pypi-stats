"use client";

import {
  formatNumber,
  formatDateForGranularity,
  formatPercentChange,
} from "@/lib/utils";
import type { Granularity } from "@/lib/utils";

const tooltipStyles = {
  wrapper: "rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] px-3 py-2 shadow-lg",
  label: "mb-1 text-xs font-medium text-[var(--tooltip-text)]",
  item: "flex items-center gap-2 text-xs",
  dot: "h-2 w-2 rounded-full shrink-0",
  name: "text-[var(--tooltip-muted)]",
  value: "ml-auto font-mono text-[var(--tooltip-text)]",
};

interface TooltipEntry {
  name?: string;
  value?: number | null;
  color?: string;
  dataKey?: string | number;
  fill?: string;
  payload?: Record<string, unknown>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number | null, name: string) => string;
  nameFormatter?: (name: string) => string;
  sortByValue?: boolean;
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  nameFormatter,
  sortByValue,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const formattedLabel = labelFormatter
    ? labelFormatter(String(label ?? ""))
    : String(label ?? "");

  const entries = sortByValue
    ? [...payload].sort((a, b) => Number(b.value ?? Number.NEGATIVE_INFINITY) - Number(a.value ?? Number.NEGATIVE_INFINITY))
    : payload;

  return (
    <div className={tooltipStyles.wrapper}>
      <div className={tooltipStyles.label}>{formattedLabel}</div>
      {entries.map((entry, i) => {
        const rawName = String(entry.name ?? entry.dataKey ?? "");
        const name = nameFormatter ? nameFormatter(rawName) : rawName;
        const numericValue = entry.value == null ? null : Number(entry.value);
        const value = valueFormatter
          ? valueFormatter(numericValue, rawName)
          : numericValue == null
            ? "n/a"
            : formatNumber(numericValue);

        return (
          <div key={i} className={tooltipStyles.item}>
            <span
              className={tooltipStyles.dot}
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className={tooltipStyles.name}>{name}</span>
            <span className={tooltipStyles.value}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

interface DateTooltipProps extends CustomTooltipProps {
  granularity?: Granularity;
  growthMode?: boolean;
}

export function DateTooltip({
  granularity = "day",
  growthMode = false,
  valueFormatter,
  ...props
}: DateTooltipProps) {
  return (
    <ChartTooltip
      {...props}
      labelFormatter={(label) => formatDateForGranularity(label, granularity, "tooltip")}
      valueFormatter={valueFormatter || ((value) => growthMode ? formatPercentChange(value) : value == null ? "n/a" : formatNumber(value))}
    />
  );
}

interface PieTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  total: number;
}

export function PieTooltip({ active, payload, total }: PieTooltipProps) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const value = Number(entry.value ?? 0);
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";

  return (
    <div className={tooltipStyles.wrapper}>
      <div className={tooltipStyles.item}>
        <span
          className={tooltipStyles.dot}
          style={{ backgroundColor: entry.payload?.fill as string || entry.color }}
        />
        <span className={tooltipStyles.name}>{entry.name}</span>
        <span className={tooltipStyles.value}>
          {formatNumber(value)} ({pct}%)
        </span>
      </div>
    </div>
  );
}
