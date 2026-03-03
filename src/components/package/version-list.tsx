"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronUp, Tag } from "lucide-react";

interface VersionListProps {
  versions: { version: string; date: string }[];
  currentVersion: string;
}

export function VersionList({ versions, currentVersion }: VersionListProps) {
  const [expanded, setExpanded] = useState(false);
  const displayVersions = expanded ? versions : versions.slice(0, 8);

  if (versions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          Recent Versions
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          {versions.length} releases
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {displayVersions.map((v) => (
            <div
              key={v.version}
              className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{v.version}</span>
                {v.version === currentVersion && (
                  <Badge variant="success" className="text-[10px] px-1.5 py-0">
                    latest
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(v.date)}
              </span>
            </div>
          ))}
        </div>
        {versions.length > 8 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {expanded ? (
              <>Show less <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Show {versions.length - 8} more <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
