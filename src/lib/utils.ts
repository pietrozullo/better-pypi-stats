import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function calculateMovingAverage(
  data: { date: string; downloads: number }[],
  window: number
): { date: string; downloads: number; movingAvg: number }[] {
  return data.map((point, i) => {
    const start = Math.max(0, i - window + 1);
    const windowSlice = data.slice(start, i + 1);
    const avg = windowSlice.reduce((sum, p) => sum + p.downloads, 0) / windowSlice.length;
    return { ...point, movingAvg: Math.round(avg) };
  });
}

export function calculateTrendLine(
  data: { date: string; downloads: number }[]
): { date: string; downloads: number; trend: number }[] {
  const n = data.length;
  if (n === 0) return [];

  const xMean = (n - 1) / 2;
  const yMean = data.reduce((sum, p) => sum + p.downloads, 0) / n;

  let numerator = 0;
  let denominator = 0;
  data.forEach((point, i) => {
    numerator += (i - xMean) * (point.downloads - yMean);
    denominator += (i - xMean) ** 2;
  });

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  return data.map((point, i) => ({
    ...point,
    trend: Math.round(slope * i + intercept),
  }));
}

export type Granularity = "day" | "week" | "month";

function getWeekKey(date: string): string {
  // ISO week: Monday-based. Return the Monday date as the key.
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setUTCDate(diff));
  return monday.toISOString().split("T")[0];
}

function getMonthKey(date: string): string {
  return date.slice(0, 7) + "-01"; // "2025-12-01"
}

/**
 * Aggregate daily data into weekly or monthly buckets.
 * Works for simple {date, downloads} arrays.
 */
export function aggregateByGranularity(
  data: { date: string; downloads: number }[],
  granularity: Granularity
): { date: string; downloads: number }[] {
  if (granularity === "day") return data;

  const keyFn = granularity === "week" ? getWeekKey : getMonthKey;
  const map = new Map<string, number>();
  for (const point of data) {
    const key = keyFn(point.date);
    map.set(key, (map.get(key) || 0) + point.downloads);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, downloads]) => ({ date, downloads }));
}

/**
 * Aggregate breakdown time series (multiple categories per date) by granularity.
 */
export function aggregateBreakdownByGranularity(
  data: Record<string, string | number>[],
  categories: string[],
  granularity: Granularity
): Record<string, string | number>[] {
  if (granularity === "day") return data;

  const keyFn = granularity === "week" ? getWeekKey : getMonthKey;
  const map = new Map<string, Record<string, number>>();

  for (const point of data) {
    const key = keyFn(String(point.date));
    if (!map.has(key)) map.set(key, {});
    const bucket = map.get(key)!;
    for (const cat of categories) {
      bucket[cat] = (bucket[cat] || 0) + Number(point[cat] || 0);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values }));
}

export const CHART_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f97316", // orange
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
];
