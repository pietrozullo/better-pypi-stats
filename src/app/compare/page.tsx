"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { X, Plus, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompareChart } from "@/components/charts/compare-chart";
import { formatNumber, CHART_COLORS } from "@/lib/utils";
import type { ComparePackage } from "@/lib/types";

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [packages, setPackages] = useState<ComparePackage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addPackage = useCallback(async (name: string) => {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return;
    if (packages.find((p) => p.name === normalized)) return;
    if (packages.length >= 5) {
      setError("Maximum 5 packages for comparison");
      return;
    }

    setLoading(normalized);
    setError(null);

    try {
      const [recentRes, overallRes] = await Promise.all([
        fetch(`/api/pypi/${encodeURIComponent(normalized)}/recent`),
        fetch(`/api/pypi/${encodeURIComponent(normalized)}/overall`),
      ]);

      if (!recentRes.ok || !overallRes.ok) {
        throw new Error(`Package "${normalized}" not found`);
      }

      const recent = await recentRes.json();
      const overall = await overallRes.json();

      const dailyMap = new Map<string, number>();
      for (const entry of overall.data) {
        if (entry.category === "without_mirrors") {
          dailyMap.set(entry.date, (dailyMap.get(entry.date) || 0) + entry.downloads);
        }
      }
      const dailyDownloads = Array.from(dailyMap.entries())
        .map(([date, downloads]) => ({ date, downloads }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const newPkg: ComparePackage = {
        name: normalized,
        color: CHART_COLORS[packages.length % CHART_COLORS.length],
        dailyDownloads,
        recentDownloads: {
          lastDay: recent.data.last_day,
          lastWeek: recent.data.last_week,
          lastMonth: recent.data.last_month,
        },
      };

      setPackages((prev) => [...prev, newPkg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load package");
    } finally {
      setLoading(null);
    }
  }, [packages, router]);

  // Load packages from URL on mount
  useEffect(() => {
    const pkgParam = searchParams.get("packages");
    if (pkgParam && packages.length === 0) {
      const names = pkgParam.split(",").filter(Boolean);
      names.forEach((name) => addPackage(name));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL with packages state
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (packages.length > 0) {
      const names = packages.map((p) => p.name).join(",");
      router.replace(`/compare?packages=${names}`, { scroll: false });
    } else {
      router.replace("/compare", { scroll: false });
    }
  }, [packages, router]);

  function removePackage(name: string) {
    setPackages((prev) =>
      prev.filter((p) => p.name !== name).map((p, i) => ({
        ...p,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Support comma-separated list of packages
    const names = inputValue.split(",").map((s) => s.trim()).filter(Boolean);
    names.forEach((name) => addPackage(name));
    setInputValue("");
  }

  return (
    <div className="animate-fade-in">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to search
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">Compare Packages</h1>
      <p className="mt-1 text-muted-foreground">
        Compare download trends across multiple PyPI packages
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <div className="flex flex-1 items-center rounded-lg border border-border bg-card px-3 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50">
          <input
            type="text"
            placeholder="Add packages (comma-separated)..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            disabled={!!loading}
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <Button type="submit" disabled={!inputValue.trim() || !!loading}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}

      {packages.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {packages.map((pkg) => (
            <Badge key={pkg.name} variant="outline" className="gap-1.5 pr-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pkg.color }} />
              {pkg.name}
              <button onClick={() => removePackage(pkg.name)} className="ml-1 rounded-sm p-0.5 hover:bg-secondary">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {packages.length > 0 && (
        <div className="mt-6">
          <CompareChart packages={packages} />
        </div>
      )}

      {packages.length > 1 && (
        <Card className="mt-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Package</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Last Day</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Last Week</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Last Month</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg/Day (30D)</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg) => {
                    const last30 = pkg.dailyDownloads.slice(-30);
                    const avg30 = last30.length > 0
                      ? Math.round(last30.reduce((s, d) => s + d.downloads, 0) / last30.length)
                      : 0;

                    return (
                      <tr key={pkg.name} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pkg.color }} />
                            <Link href={`/package/${pkg.name}`} className="font-medium hover:underline">
                              {pkg.name}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{formatNumber(pkg.recentDownloads.lastDay)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNumber(pkg.recentDownloads.lastWeek)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNumber(pkg.recentDownloads.lastMonth)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatNumber(avg30)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {packages.length === 0 && !loading && (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="rounded-full bg-secondary p-4">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-medium">No packages added</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add packages above to start comparing download trends
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["flask,django,fastapi", "requests,httpx,aiohttp", "numpy,pandas,polars"].map(
              (combo) => (
                <Button
                  key={combo}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    router.push(`/compare?packages=${combo}`);
                    combo.split(",").forEach((name) => addPackage(name));
                  }}
                >
                  {combo.split(",").join(" vs ")}
                </Button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareContent />
    </Suspense>
  );
}
