"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";

type Registry = "pypi" | "npm";

interface Result {
  name: string;
  registry: Registry;
  description?: string;
}

const POPULAR: Result[] = [
  { name: "requests", registry: "pypi" },
  { name: "react", registry: "npm" },
  { name: "numpy", registry: "pypi" },
  { name: "next", registry: "npm" },
  { name: "fastapi", registry: "pypi" },
  { name: "typescript", registry: "npm" },
  { name: "pandas", registry: "pypi" },
  { name: "axios", registry: "npm" },
];

const RECENT_KEY = "command-palette-recent";
const MAX_RECENT = 6;

function loadRecent(): Result[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(item: Result) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadRecent().filter(
      (r) => !(r.name === item.name && r.registry === item.registry)
    );
    const next = [item, ...existing].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

async function searchNpm(q: string, signal: AbortSignal): Promise<Result[]> {
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=8`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    objects?: { package: { name: string; description?: string } }[];
  };
  return (
    json.objects?.map((o) => ({
      name: o.package.name,
      registry: "npm" as const,
      description: o.package.description,
    })) ?? []
  );
}

async function searchPypi(q: string, signal: AbortSignal): Promise<Result[]> {
  // PyPI has no public JSON search API. Validate the typed query as an exact
  // package name via the JSON endpoint; if it exists, surface it as a hit.
  const url = `https://pypi.org/pypi/${encodeURIComponent(q)}/json`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      info?: { name?: string; summary?: string };
    };
    if (!json.info?.name) return [];
    return [
      {
        name: json.info.name,
        registry: "pypi" as const,
        description: json.info.summary,
      },
    ];
  } catch {
    return [];
  }
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recent, setRecent] = useState<Result[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open with cmd/ctrl+k from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Reset state and refresh recent list whenever the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setRecent(loadRecent());
      // Defer focus to next tick so the input is mounted.
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Debounced search across npm + pypi.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const [npm, pypi] = await Promise.all([
          searchNpm(trimmed, controller.signal),
          searchPypi(trimmed, controller.signal),
        ]);
        // pypi exact match first, then npm hits.
        setResults([...pypi, ...npm]);
      } catch {
        // ignore
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [query]);

  const visible = useMemo<Result[]>(() => {
    if (query.trim()) return results;
    return recent.length ? recent : POPULAR;
  }, [query, results, recent]);

  // Reset selection whenever the visible list changes.
  useEffect(() => {
    setSelectedIdx(0);
  }, [visible]);

  const navigate = useCallback(
    (item: Result) => {
      saveRecent(item);
      setOpen(false);
      router.push(`/${item.registry}/${encodeURIComponent(item.name)}`);
    },
    [router]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = visible[selectedIdx];
      if (target) navigate(target);
    }
  }

  if (!open) return null;

  const heading = query.trim()
    ? "Results"
    : recent.length
      ? "Recent"
      : "Popular";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[15vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl animate-fade-in">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search packages on PyPI and npm…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            esc
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-1">
          <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {heading}
          </div>
          {visible.length === 0 && !loading && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {query.trim() ? "No matches" : "Start typing to search"}
            </div>
          )}
          {visible.map((item, i) => (
            <button
              key={`${item.registry}:${item.name}`}
              onMouseEnter={() => setSelectedIdx(i)}
              onClick={() => navigate(item)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                i === selectedIdx
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Package className="h-3.5 w-3.5 shrink-0" />
              <span className="shrink-0 rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] uppercase">
                {item.registry}
              </span>
              <span className="shrink-0 font-medium text-foreground">
                {item.name}
              </span>
              {item.description && (
                <span className="truncate text-xs text-muted-foreground">
                  {item.description}
                </span>
              )}
              {i === selectedIdx && (
                <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-border bg-secondary px-1 py-0.5">
                ↑↓
              </kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="rounded border border-border bg-secondary px-1 py-0.5">
                ↵
              </kbd>{" "}
              open
            </span>
          </div>
          <span>
            <kbd className="rounded border border-border bg-secondary px-1 py-0.5">
              ⌘K
            </kbd>{" "}
            anywhere
          </span>
        </div>
      </div>
    </div>
  );
}
