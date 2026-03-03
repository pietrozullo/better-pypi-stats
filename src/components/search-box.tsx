"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBoxProps {
  large?: boolean;
  autoFocus?: boolean;
  className?: string;
  registry?: "pypi" | "npm";
}

export function SearchBox({ large = false, autoFocus = false, className, registry = "pypi" }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const popularPackages = [
    "requests", "numpy", "pandas", "flask", "django",
    "fastapi", "boto3", "tensorflow", "pytorch", "scikit-learn",
  ];

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback((packageName: string) => {
    const trimmed = packageName.trim().toLowerCase();
    if (!trimmed) return;
    setIsLoading(true);
    setShowSuggestions(false);
    // Support explicit registry prefix: "npm/express" or "pypi/requests"
    if (trimmed.startsWith("npm/")) {
      router.push(`/npm/${encodeURIComponent(trimmed.slice(4))}`);
    } else if (trimmed.startsWith("pypi/")) {
      router.push(`/pypi/${encodeURIComponent(trimmed.slice(5))}`);
    } else {
      router.push(`/${registry}/${encodeURIComponent(trimmed)}`);
    }
  }, [router, registry]);

  function handleInputChange(value: string) {
    setQuery(value);
    setSelectedIndex(-1);
    if (value.length >= 2) {
      const filtered = popularPackages.filter((p) =>
        p.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSearch(suggestions[selectedIndex]);
      } else {
        handleSearch(query);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center rounded-lg border border-border bg-card transition-all focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50",
          large ? "h-14 px-5" : "h-10 px-3"
        )}
      >
        {isLoading ? (
          <Loader2 className={cn("shrink-0 text-muted-foreground animate-spin", large ? "h-5 w-5" : "h-4 w-4")} />
        ) : (
          <Search className={cn("shrink-0 text-muted-foreground", large ? "h-5 w-5" : "h-4 w-4")} />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search PyPI packages..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.length >= 2 && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          className={cn(
            "flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
            large ? "ml-3 text-lg" : "ml-2 text-sm"
          )}
        />
        {query && (
          <button
            onClick={() => handleSearch(query)}
            className="shrink-0 rounded-md bg-chart-1 p-1.5 text-white transition-colors hover:bg-chart-1/90"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-card p-1 shadow-lg animate-fade-in">
          {suggestions.map((pkg, i) => (
            <button
              key={pkg}
              onClick={() => handleSearch(pkg)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                i === selectedIndex
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Search className="h-3 w-3" />
              {pkg}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
