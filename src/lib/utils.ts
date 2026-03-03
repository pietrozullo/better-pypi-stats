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
