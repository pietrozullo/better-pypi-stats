"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Tooltip,
  Legend,
  AreaChart,
  LineChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Filter, Check } from "lucide-react";
import { ChartExportWrapper } from "./chart-export";
import { DateTooltip } from "./chart-tooltip";
import { useChartColors } from "./use-chart-colors";
import { formatNumber, formatDateShort, calculateMovingAverage, calculateTrendLine, CHART_COLORS } from "@/lib/utils";
import type { BreakdownTimeSeries } from "@/lib/types";

interface BreakdownOption {
  label: string;
  key: string;
  data: BreakdownTimeSeries;
  categories: string[];
  /** "stacked" for OS/Python (parts of a whole), "lines" for versions (overlapping) */
  mode?: "stacked" | "lines";
}

interface DownloadChartProps {
  data: { date: string; downloads: number }[];
  title?: string;
  color?: string;
  packageName?: string;
  breakdowns?: BreakdownOption[];
}

const DATE_RANGES = [
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "180D", days: 180 },
  { label: "1Y", days: 365, extended: true },
  { label: "2Y", days: 730, extended: true },
];

export function DownloadChart({
  data,
  title = "Downloads Over Time",
  color = "#6366f1",
  packageName = "chart",
  breakdowns = [],
}: DownloadChartProps) {
  const [dateRange, setDateRange] = useState(90);
  const [showMA, setShowMA] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  const [extendedData, setExtendedData] = useState<{ date: string; downloads: number }[] | null>(null);
  const [extendedVersionData, setExtendedVersionData] = useState<{
    data: BreakdownTimeSeries;
    categories: string[];
  } | null>(null);
  const [loadingExtended, setLoadingExtended] = useState(false);
  const chartColors = useChartColors();
  const fetchCache = useRef(new Map<string, unknown>());

  // Fetch extended data from BigQuery
  const fetchExtendedData = useCallback(async (days: number, type: "history" | "versions") => {
    const cacheKey = `${type}-${days}`;
    if (fetchCache.current.has(cacheKey)) return fetchCache.current.get(cacheKey);

    setLoadingExtended(true);
    try {
      const url = type === "history"
        ? `/api/pypi/${encodeURIComponent(packageName)}/history?days=${days}`
        : `/api/pypi/${encodeURIComponent(packageName)}/versions?days=${days}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.available) {
        fetchCache.current.set(cacheKey, json);
        if (type === "history" && json.data) {
          setExtendedData(json.data);
        } else if (type === "versions" && json.data && json.categories) {
          setExtendedVersionData({ data: json.data, categories: json.categories });
        }
        return json;
      }
    } catch {
      // Fall back to existing data
    } finally {
      setLoadingExtended(false);
    }
    return null;
  }, [packageName]);

  // When date range or breakdown changes, fetch extended data if needed
  useEffect(() => {
    if (dateRange > 180) {
      if (activeBreakdown === "version") {
        fetchExtendedData(dateRange, "versions");
      }
      if (!activeBreakdown) {
        fetchExtendedData(dateRange, "history");
      }
    } else {
      // Reset extended data for short ranges so we use pre-fetched data
      setExtendedVersionData(null);
    }
  }, [dateRange, activeBreakdown, fetchExtendedData]);

  function handleDateRangeChange(days: number) {
    setDateRange(days);
  }

  // Use extended data when available and range > 180 days, otherwise use pypistats data
  const sourceData = dateRange > 180 && extendedData ? extendedData : data;

  const filteredData = useMemo(() => {
    const cutoff = sourceData.length - dateRange;
    return sourceData.slice(Math.max(0, cutoff));
  }, [sourceData, dateRange]);

  const chartData = useMemo(() => {
    let result = filteredData.map((d) => ({ ...d }));
    if (showMA) {
      const withMA = calculateMovingAverage(filteredData, 7);
      result = withMA;
    }
    if (showTrend) {
      const withTrend = calculateTrendLine(filteredData);
      result = result.map((d, i) => ({
        ...d,
        trend: withTrend[i]?.trend,
      }));
    }
    return result;
  }, [filteredData, showMA, showTrend]);

  // Get the active breakdown data (filtered by date range)
  const currentBreakdown = useMemo(() => {
    if (!activeBreakdown) return null;

    // For version breakdown with extended range, use dynamically fetched data
    if (activeBreakdown === "version" && dateRange > 180 && extendedVersionData) {
      return {
        label: "Version",
        key: "version",
        mode: "lines" as const,
        data: extendedVersionData.data,
        categories: extendedVersionData.categories,
      };
    }

    const bd = breakdowns.find((b) => b.key === activeBreakdown);
    if (!bd) return null;
    const cutoff = bd.data.length - dateRange;
    return {
      ...bd,
      mode: bd.mode || "stacked",
      data: bd.data.slice(Math.max(0, cutoff)),
    };
  }, [activeBreakdown, breakdowns, dateRange, extendedVersionData]);

  const isBreakdownMode = currentBreakdown !== null;

  // Category filter state
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Reset hidden categories when breakdown changes
  useEffect(() => {
    setHiddenCategories(new Set());
    setFilterOpen(false);
  }, [activeBreakdown]);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [filterOpen]);

  const visibleCategories = currentBreakdown
    ? currentBreakdown.categories.filter((c) => !hiddenCategories.has(c))
    : [];

  function toggleCategory(cat: string) {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        // Don't allow hiding all categories
        if (currentBreakdown && next.size >= currentBreakdown.categories.length - 1) return prev;
        next.add(cat);
      }
      return next;
    });
  }

  return (
    <ChartExportWrapper filename={`${packageName}-downloads-${activeBreakdown || "overall"}-${dateRange}d`}>
      <Card data-chart-card>
        <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex flex-wrap items-center gap-1">
            {/* Breakdown toggles */}
            {breakdowns.length > 0 && (
              <div className="flex items-center rounded-md border border-border mr-1">
                <button
                  onClick={() => setActiveBreakdown(null)}
                  className={`px-2 py-1 text-xs transition-colors ${
                    !activeBreakdown
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Total
                </button>
                {breakdowns.map((bd) => (
                  <button
                    key={bd.key}
                    onClick={() => setActiveBreakdown(activeBreakdown === bd.key ? null : bd.key)}
                    className={`px-2 py-1 text-xs transition-colors ${
                      activeBreakdown === bd.key
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {bd.label}
                  </button>
                ))}
              </div>
            )}
            {/* Category filter dropdown */}
            {isBreakdownMode && currentBreakdown.categories.length > 2 && (
              <div ref={filterRef} className="relative">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                    hiddenCategories.size > 0
                      ? "border-chart-1 text-chart-1"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  {hiddenCategories.size > 0
                    ? `${visibleCategories.length}/${currentBreakdown.categories.length}`
                    : "Filter"}
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-card p-1 shadow-lg animate-fade-in">
                    <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Show / Hide
                    </div>
                    {currentBreakdown.categories.map((cat, i) => {
                      const isVisible = !hiddenCategories.has(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                            isVisible
                              ? "text-foreground"
                              : "text-muted-foreground opacity-50"
                          } hover:bg-secondary`}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-sm shrink-0"
                            style={{
                              backgroundColor: isVisible
                                ? CHART_COLORS[i % CHART_COLORS.length]
                                : "transparent",
                              border: isVisible
                                ? "none"
                                : `1.5px solid ${CHART_COLORS[i % CHART_COLORS.length]}`,
                            }}
                          />
                          <span className="flex-1 text-left truncate">{cat}</span>
                          {isVisible && <Check className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        </button>
                      );
                    })}
                    {hiddenCategories.size > 0 && (
                      <>
                        <div className="my-1 border-t border-border" />
                        <button
                          onClick={() => setHiddenCategories(new Set())}
                          className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          Show all
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* MA/Trend only in total mode */}
            {!isBreakdownMode && (
              <>
                <Button
                  variant={showMA ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowMA(!showMA)}
                  className="text-xs h-7"
                >
                  7D MA
                </Button>
                <Button
                  variant={showTrend ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowTrend(!showTrend)}
                  className="text-xs h-7"
                >
                  Trend
                </Button>
              </>
            )}
            {loadingExtended && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            <div className="flex items-center rounded-md border border-border">
              {DATE_RANGES.map((range) => (
                <button
                  key={range.days}
                  onClick={() => handleDateRangeChange(range.days)}
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              {isBreakdownMode && currentBreakdown.mode === "lines" ? (
                /* Line chart for version breakdown (overlapping, not stacked) */
                <LineChart
                  data={currentBreakdown.data}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                >
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
                    tickFormatter={formatNumber}
                    stroke={chartColors.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<DateTooltip sortByValue />} />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-xs">{value}</span>
                    )}
                  />
                  {currentBreakdown.categories.map((cat, i) =>
                    hiddenCategories.has(cat) ? null : (
                      <Line
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                    )
                  )}
                </LineChart>
              ) : isBreakdownMode ? (
                /* Stacked area chart for OS/Python breakdown */
                <AreaChart
                  data={currentBreakdown.data}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                >
                  <defs>
                    {currentBreakdown.categories.map((cat, i) => (
                      <linearGradient key={cat} id={`bd-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
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
                    tickFormatter={formatNumber}
                    stroke={chartColors.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<DateTooltip sortByValue />} />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-xs">{value}</span>
                    )}
                  />
                  {currentBreakdown.categories.map((cat, i) =>
                    hiddenCategories.has(cat) ? null : (
                      <Area
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        stackId="1"
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        fill={`url(#bd-grad-${i})`}
                        strokeWidth={1.5}
                        dot={false}
                      />
                    )
                  )}
                </AreaChart>
              ) : (
                /* Default composed chart */
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                    tickFormatter={formatNumber}
                    stroke={chartColors.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={
                      <DateTooltip
                        nameFormatter={(name) =>
                          name === "movingAvg" ? "7D Average" : name === "trend" ? "Trend" : "Downloads"
                        }
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="downloads"
                    stroke={color}
                    fill={`url(#gradient-${color})`}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: color }}
                  />
                  {showMA && (
                    <Line
                      type="monotone"
                      dataKey="movingAvg"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="0"
                    />
                  )}
                  {showTrend && (
                    <Line
                      type="monotone"
                      dataKey="trend"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="6 3"
                    />
                  )}
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </ChartExportWrapper>
  );
}
