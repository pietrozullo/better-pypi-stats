"use client";

import { useEffect, useState } from "react";

function getCSSVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function useChartColors() {
  const [colors, setColors] = useState({
    grid: "#27272a",
    axis: "#71717a",
    tooltipBg: "#111113",
    tooltipBorder: "#27272a",
    background: "#030304",
    card: "#111113",
  });

  useEffect(() => {
    function update() {
      setColors({
        grid: getCSSVar("--chart-grid") || "#27272a",
        axis: getCSSVar("--chart-axis") || "#71717a",
        tooltipBg: getCSSVar("--tooltip-bg") || "#111113",
        tooltipBorder: getCSSVar("--tooltip-border") || "#27272a",
        background: getCSSVar("--background") || "#030304",
        card: getCSSVar("--card") || "#111113",
      });
    }

    update();

    // Re-read on theme change (class change on <html>)
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}
