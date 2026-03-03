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

type Registry = "pypi" | "npm";

function parsePackageSpec(spec: string): { registry: Registry; name: string } {
  if (spec.startsWith("npm:")) return { registry: "npm", name: spec.slice(4) };
  if (spec.startsWith("pypi:")) return { registry: "pypi", name: spec.slice(5) };
  return { registry: "pypi", name: spec };
}

function toSpec(pkg: ComparePackage): string {
  return `${pkg.registry}:${pkg.name}`;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [packages, setPackages] = useState<ComparePackage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedRegistry, setSelectedRegistry] = useState<Registry>("pypi");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addPackage = useCallback(async (name: string, registry: Registry) => {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return;
    const key = `${registry}:${normalized}`;
    if (packages.find((p) => `${p.registry}:${p.name}` === key)) return;
    if (packages.length >= 5) {
      setError("Maximum 5 packages for comparison");
      return;
    }

    setLoading(normalized);
    setError(null);

    try {
      let dailyDownloads: { date: string; downloads: number }[];
      let recentDownloads: { lastDay: number; lastWeek: number; lastMonth: number };

      if (registry === "npm") {
        const [recentRes, overallRes] = await Promise.all([
          fetch(`/api/npm/${encodeURIComponent(normalized)}/recent`),
          fetch(`/api/npm/${encodeURIComponent(normalized)}/overall`),
        ]);
        if (!recentRes.ok || !overallRes.ok) throw new Error(`npm package "${normalized}" not found`);
        const recent = await recentRes.json();
        const overall = await overallRes.json();
        dailyDownloads = overall.data;
        recentDownloads = { lastDay: recent.data.last_day, lastWeek: recent.data.last_week, lastMonth: recent.data.last_month };
      } else {
        const [recentRes, overallRes] = await Promise.all([
          fetch(`/api/pypi/${encodeURIComponent(normalized)}/recent`),
          fetch(`/api/pypi/${encodeURIComponent(normalized)}/overall`),
        ]);
        if (!recentRes.ok || !overallRes.ok) throw new Error(`PyPI package "${normalized}" not found`);
        const recent = await recentRes.json();
        const overall = await overallRes.json();
        const dailyMap = new Map<string, number>();
        for (const entry of overall.data) {
          if (entry.category === "without_mirrors") {
            dailyMap.set(entry.date, (dailyMap.get(entry.date) || 0) + entry.downloads);
          }
        }
        dailyDownloads = Array.from(dailyMap.entries())
          .map(([date, downloads]) => ({ date, downloads }))
          .sort((a, b) => a.date.localeCompare(b.date));
        recentDownloads = { lastDay: recent.data.last_day, lastWeek: recent.data.last_week, lastMonth: recent.data.last_month };
      }

      const newPkg: ComparePackage = {
        name: normalized,
        registry,
        color: CHART_COLORS[packages.length % CHART_COLORS.length],
        dailyDownloads,
        recentDownloads,
      };

      setPackages((prev) => [...prev, newPkg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load package");
    } finally {
      setLoading(null);
    }
  }, [packages]);

  useEffect(() => {
    const pkgParam = searchParams.get("packages");
    if (pkgParam && packages.length === 0) {
      const specs = pkgParam.split(",").filter(Boolean);
      specs.forEach((spec) => {
        const { registry, name } = parsePackageSpec(spec);
        addPackage(name, registry);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (packages.length > 0) {
      const specs = packages.map(toSpec).join(",");
      router.replace(`/compare?packages=${specs}`, { scroll: false });
    } else {
      router.replace("/compare", { scroll: false });
    }
  }, [packages, router]);

  function removePackage(registry: Registry, name: string) {
    setPackages((prev) =>
      prev.filter((p) => !(p.registry === registry && p.name === name)).map((p, i) => ({
        ...p,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const names = inputValue.split(",").map((s) => s.trim()).filter(Boolean);
    names.forEach((name) => addPackage(name, selectedRegistry));
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
        Compare download trends across PyPI and npm packages
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <div className="flex items-center rounded-md border border-border">
          <button
            type="button"
            onClick={() => setSelectedRegistry("pypi")}
            className={`px-3 py-2.5 text-xs font-medium transition-colors ${
              selectedRegistry === "pypi" ? "bg-secondary text-foreground" : "text-muted-foreground"
            }`}
          >
            PyPI
          </button>
          <button
            type="button"
            onClick={() => setSelectedRegistry("npm")}
            className={`px-3 py-2.5 text-xs font-medium transition-colors ${
              selectedRegistry === "npm" ? "bg-secondary text-foreground" : "text-muted-foreground"
            }`}
          >
            npm
          </button>
        </div>
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
            <Badge key={toSpec(pkg)} variant="outline" className="gap-1.5 pr-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pkg.color }} />
              <span className="text-[9px] text-muted-foreground">{pkg.registry}</span>
              {pkg.name}
              <button onClick={() => removePackage(pkg.registry, pkg.name)} className="ml-1 rounded-sm p-0.5 hover:bg-secondary">
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
                      <tr key={toSpec(pkg)} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pkg.color }} />
                            <Link href={`/${pkg.registry}/${pkg.name}`} className="font-medium hover:underline">
                              {pkg.name}
                            </Link>
                            <span className="text-[9px] text-muted-foreground rounded bg-secondary px-1 py-0.5">{pkg.registry}</span>
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
            {[
              "pypi:flask,pypi:django,pypi:fastapi",
              "npm:react,npm:vue,npm:svelte",
              "pypi:requests,npm:axios",
            ].map((combo) => (
              <Button
                key={combo}
                variant="outline"
                size="sm"
                onClick={() => {
                  router.push(`/compare?packages=${combo}`);
                  combo.split(",").forEach((spec) => {
                    const { registry, name } = parsePackageSpec(spec);
                    addPackage(name, registry);
                  });
                }}
              >
                {combo.split(",").map(s => {
                  const { name } = parsePackageSpec(s);
                  return name;
                }).join(" vs ")}
              </Button>
            ))}
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
