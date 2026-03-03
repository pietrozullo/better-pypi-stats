"use client";

import { useRef, type ReactNode } from "react";
import { toPng, toSvg } from "html-to-image";
import { ImageIcon, FileCode } from "lucide-react";
import { useChartColors } from "./use-chart-colors";
import { Logo } from "@/components/logo";

interface ChartExportWrapperProps {
  children: ReactNode;
  filename: string;
}

export function ChartExportWrapper({ children, filename }: ChartExportWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartColors = useChartColors();

  async function exportAs(format: "png" | "svg") {
    if (!chartRef.current) return;

    const watermark = chartRef.current.querySelector("[data-watermark]") as HTMLElement;
    const card = chartRef.current.querySelector("[data-chart-card]") as HTMLElement;
    if (watermark) watermark.style.display = "flex";
    if (card) {
      card.style.borderBottomLeftRadius = "0";
      card.style.borderBottomRightRadius = "0";
      card.style.borderBottom = "none";
    }

    try {
      const options = {
        backgroundColor: chartColors.background,
        pixelRatio: 2,
        style: {
          borderColor: chartColors.grid,
        },
      };

      let dataUrl: string;
      if (format === "png") {
        dataUrl = await toPng(chartRef.current, options);
      } else {
        dataUrl = await toSvg(chartRef.current, options);
      }

      const link = document.createElement("a");
      link.download = `${filename}.${format}`;
      link.href = dataUrl;
      link.click();
    } finally {
      if (watermark) watermark.style.display = "none";
      if (card) {
        card.style.borderBottomLeftRadius = "";
        card.style.borderBottomRightRadius = "";
        card.style.borderBottom = "";
      }
    }
  }

  return (
    <div className="group relative">
      <div ref={chartRef}>
        {children}
        <div
          data-watermark
          className="items-center justify-center gap-1.5 border border-t-0 border-border bg-card px-4 py-2.5 rounded-b-lg"
          style={{ display: "none" }}
        >
          <Logo size={16} />
          <span className="text-[10px] text-muted-foreground">
            made with better-pypi-stats
          </span>
        </div>
      </div>

      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md border border-border bg-card/90 p-0.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
        <button
          onClick={() => exportAs("png")}
          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Export as PNG"
        >
          <ImageIcon className="h-3 w-3" />
          PNG
        </button>
        <button
          onClick={() => exportAs("svg")}
          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Export as SVG"
        >
          <FileCode className="h-3 w-3" />
          SVG
        </button>
      </div>
    </div>
  );
}
