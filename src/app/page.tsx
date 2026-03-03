"use client";

import { useRouter } from "next/navigation";
import { SearchBox } from "@/components/search-box";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Package, GitCompare } from "lucide-react";
import { Logo } from "@/components/logo";

const TRENDING_PACKAGES = [
  { name: "requests", description: "HTTP library for Python" },
  { name: "numpy", description: "Scientific computing" },
  { name: "pandas", description: "Data analysis toolkit" },
  { name: "flask", description: "Lightweight web framework" },
  { name: "django", description: "Full-featured web framework" },
  { name: "fastapi", description: "Modern async web framework" },
  { name: "boto3", description: "AWS SDK for Python" },
  { name: "pydantic", description: "Data validation" },
  { name: "pytest", description: "Testing framework" },
  { name: "httpx", description: "Async HTTP client" },
  { name: "uvicorn", description: "ASGI server" },
  { name: "sqlalchemy", description: "SQL toolkit & ORM" },
];

const COMPARE_SUGGESTIONS = [
  { packages: ["flask", "django", "fastapi"], label: "Web Frameworks" },
  { packages: ["requests", "httpx", "aiohttp"], label: "HTTP Clients" },
  { packages: ["numpy", "pandas", "polars"], label: "Data Libraries" },
  { packages: ["pytest", "unittest2", "nose2"], label: "Testing" },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <div className="flex flex-col items-center gap-6 pt-16 pb-16 text-center animate-fade-in-up">
        <Badge variant="outline" className="gap-1.5">
          <TrendingUp className="h-3 w-3" />
          PyPI Download Analytics
        </Badge>
        <div className="flex items-center gap-3">
          <Logo size={48} />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            better-pypi-stats
          </h1>
        </div>
        <p className="max-w-lg text-muted-foreground">
          Explore download trends, compare packages, and analyze Python ecosystem
          data with beautiful, interactive charts.
        </p>
        <SearchBox large autoFocus className="w-full max-w-xl" />
      </div>

      {/* Trending Packages */}
      <section className="w-full max-w-4xl animate-fade-in" style={{ animationDelay: "0.2s", opacity: 0 }}>
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground">Popular Packages</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {TRENDING_PACKAGES.map((pkg) => (
            <button
              key={pkg.name}
              onClick={() => router.push(`/package/${pkg.name}`)}
              className="group flex items-center justify-between rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-ring hover:bg-secondary"
            >
              <div>
                <div className="text-sm font-medium">{pkg.name}</div>
                <div className="text-xs text-muted-foreground">{pkg.description}</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </section>

      {/* Compare Suggestions */}
      <section className="mt-12 w-full max-w-4xl animate-fade-in" style={{ animationDelay: "0.4s", opacity: 0 }}>
        <div className="mb-4 flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground">Quick Comparisons</h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {COMPARE_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.label}
              onClick={() =>
                router.push(
                  `/compare?packages=${suggestion.packages.join(",")}`
                )
              }
              className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-ring hover:bg-secondary"
            >
              <div>
                <div className="text-sm font-medium">{suggestion.label}</div>
                <div className="mt-1 flex gap-1.5">
                  {suggestion.packages.map((pkg) => (
                    <Badge key={pkg} variant="secondary" className="text-xs">
                      {pkg}
                    </Badge>
                  ))}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
