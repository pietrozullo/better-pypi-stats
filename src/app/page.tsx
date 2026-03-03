"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchBox } from "@/components/search-box";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Package, GitCompare } from "lucide-react";
import { Logo } from "@/components/logo";

type Registry = "pypi" | "npm";

const PYPI_PACKAGES = [
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

const NPM_PACKAGES = [
  { name: "react", description: "UI component library" },
  { name: "next", description: "React framework" },
  { name: "typescript", description: "Typed JavaScript" },
  { name: "express", description: "Web framework" },
  { name: "axios", description: "HTTP client" },
  { name: "lodash", description: "Utility library" },
  { name: "tailwindcss", description: "Utility-first CSS" },
  { name: "zod", description: "Schema validation" },
  { name: "prisma", description: "Database ORM" },
  { name: "eslint", description: "Code linter" },
  { name: "vitest", description: "Testing framework" },
  { name: "esbuild", description: "JS bundler" },
];

const COMPARE_SUGGESTIONS = [
  { packages: ["pypi:flask", "pypi:django", "pypi:fastapi"], label: "Python Web Frameworks" },
  { packages: ["npm:react", "npm:vue", "npm:svelte"], label: "JS UI Frameworks" },
  { packages: ["pypi:requests", "npm:axios"], label: "HTTP Clients: Python vs JS" },
  { packages: ["npm:express", "npm:fastify", "npm:hono"], label: "Node.js Servers" },
];

export default function HomePage() {
  const router = useRouter();
  const [registry, setRegistry] = useState<Registry>("pypi");

  const packages = registry === "pypi" ? PYPI_PACKAGES : NPM_PACKAGES;

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <div className="flex flex-col items-center gap-6 pt-16 pb-16 text-center animate-fade-in-up">
        <Badge variant="outline" className="gap-1.5">
          <TrendingUp className="h-3 w-3" />
          Package Download Analytics
        </Badge>
        <div className="flex items-center gap-3">
          <Logo size={48} />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            better-stats
          </h1>
        </div>
        <p className="max-w-lg text-muted-foreground">
          Explore download trends, compare packages, and analyze PyPI &amp; npm
          ecosystem data with beautiful, interactive charts.
        </p>
        <SearchBox large autoFocus className="w-full max-w-xl" registry={registry} />
      </div>

      {/* Trending Packages */}
      <section className="w-full max-w-4xl animate-fade-in" style={{ animationDelay: "0.2s", opacity: 0 }}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground">Popular Packages</h2>
          </div>
          <div className="flex items-center rounded-md border border-border">
            <button
              onClick={() => setRegistry("pypi")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                registry === "pypi"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              PyPI
            </button>
            <button
              onClick={() => setRegistry("npm")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                registry === "npm"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              npm
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {packages.map((pkg) => (
            <button
              key={pkg.name}
              onClick={() => router.push(`/${registry}/${pkg.name}`)}
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
                  {suggestion.packages.map((pkg) => {
                    const [reg, name] = pkg.includes(":") ? pkg.split(":") : ["pypi", pkg];
                    return (
                      <Badge key={pkg} variant="secondary" className="text-xs gap-1">
                        <span className="text-[9px] text-muted-foreground">{reg}</span>
                        {name}
                      </Badge>
                    );
                  })}
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
