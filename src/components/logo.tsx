"use client";

import Image from "next/image";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className }: LogoProps) {
  const { theme } = useTheme();

  return (
    <Image
      src={theme === "dark" ? "/logo-light.svg" : "/logo-dark.svg"}
      alt="better-pypi-stats"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
  );
}
