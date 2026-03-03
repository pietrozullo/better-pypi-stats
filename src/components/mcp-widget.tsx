"use client";

import { useState, useEffect, useRef } from "react";
import { X, Copy, Check, ExternalLink } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

function McpLogo({ size = 24, className }: { size?: number; className?: string }) {
  const { theme } = useTheme();
  const fill = theme === "dark" ? "#fff" : "#000";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 303 303"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g fill={fill} fillRule="nonzero">
        <path d="m105.5 34.8.6.6c9.5 9.5 14.4 21.9 14.6 34.4a112.6 112.6 0 0 0 112.2 112.1h.6c12 .4 24 5.1 33.2 14.1l.6.6a50 50 0 0 1-70.1 71.3l-.6-.6A49.9 49.9 0 0 1 182 230 112.6 112.6 0 0 0 73.4 120.7h-.8a49.9 49.9 0 0 1-36.7-14l-.5-.6a50 50 0 0 1-.6-70.2l.6-.5a50 50 0 0 1 69.5-1.2l.6.6Z" />
        <circle cx="70.3" cy="232.3" r="50" />
        <circle cx="232.3" cy="70.3" r="50" />
      </g>
    </svg>
  );
}

function useMcpUrl() {
  if (typeof window === "undefined") return "https://better-pipy-downloads.vercel.app/api/mcp";
  return `${window.location.origin}/api/mcp`;
}

function buildClients(mcpUrl: string) {
  const jsonConfig = `{
  "mcpServers": {
    "better-stats": {
      "url": "${mcpUrl}"
    }
  }
}`;
  return [
    {
      name: "Claude Desktop",
      description: "Add to claude_desktop_config.json",
      config: jsonConfig,
    },
    {
      name: "Claude Code",
      description: "Run in terminal",
      config: `claude mcp add better-stats --transport http ${mcpUrl}`,
    },
    {
      name: "Cursor",
      description: "Add to .cursor/mcp.json",
      config: jsonConfig,
    },
  ];
}

const TOOLS = [
  { name: "get_package_stats", description: "Download stats for any PyPI or npm package" },
  { name: "compare_packages", description: "Cross-registry package comparison" },
  { name: "get_package_info", description: "Package metadata, versions, license" },
];

export function McpWidget() {
  const [open, setOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mcpUrl = useMcpUrl();
  const clients = buildClients(mcpUrl);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  function copyToClipboard(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50" ref={panelRef}>
      {/* Panel */}
      {open && (
        <div className="absolute bottom-16 right-0 w-[380px] rounded-xl border border-border bg-card shadow-2xl animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <McpLogo size={18} />
              <span className="text-sm font-semibold">MCP Server</span>
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                Live
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            {/* Endpoint */}
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Endpoint
              </div>
              <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2">
                <code className="flex-1 text-xs font-mono truncate">{mcpUrl}</code>
                <button
                  onClick={() => copyToClipboard(mcpUrl, -1)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {copiedIndex === -1 ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Connect to Clients */}
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Connect
              </div>
              <div className="space-y-2">
                {clients.map((client, i) => (
                  <div key={client.name} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium">{client.name}</span>
                      <span className="text-[10px] text-muted-foreground">{client.description}</span>
                    </div>
                    <div className="relative">
                      <pre className="rounded-md bg-secondary p-2.5 text-[10px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
                        {client.config}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(client.config, i)}
                        className="absolute top-1.5 right-1.5 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {copiedIndex === i ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Tools */}
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Available Tools
              </div>
              <div className="space-y-1">
                {TOOLS.map((tool) => (
                  <div key={tool.name} className="flex items-start gap-2 rounded-md px-2 py-1.5">
                    <code className="text-[10px] font-mono font-medium text-chart-1 shrink-0">{tool.name}</code>
                    <span className="text-[10px] text-muted-foreground">{tool.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inspector link */}
            <a
              href="https://inspector.mcp-use.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Test with MCP Inspector
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex h-12 w-12 items-center justify-center rounded-full border border-border shadow-lg transition-all hover:scale-105 ${
          open ? "bg-chart-1 border-chart-1" : "bg-card hover:bg-secondary"
        }`}
        title="MCP Server"
      >
        <McpLogo size={open ? 22 : 20} />
      </button>
    </div>
  );
}
