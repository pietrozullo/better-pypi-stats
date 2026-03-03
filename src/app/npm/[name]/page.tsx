import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getNpmPackageStats, getNpmPackageInfo } from "@/lib/npm-api";
import { getOverallDownloads } from "@/lib/api";
import { PackageView } from "@/components/package/package-view";
import { PackageViewSkeleton } from "@/components/package/package-view-skeleton";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { name } = await params;
  return {
    title: `${name} (npm) - better-stats`,
    description: `Download statistics for ${name} npm package`,
  };
}

async function PackageData({ name }: { name: string }) {
  try {
    const [stats, info] = await Promise.all([
      getNpmPackageStats(name),
      getNpmPackageInfo(name),
    ]);

    // Check if same package exists on PyPI
    let crossRegistryDownloads: { date: string; downloads: number }[] | undefined;
    try {
      const pypiData = await getOverallDownloads(name);
      if (pypiData.data.length > 0) {
        // Aggregate PyPI daily downloads (without mirrors)
        const dailyMap = new Map<string, number>();
        for (const entry of pypiData.data) {
          if (entry.category === "without_mirrors") {
            dailyMap.set(entry.date, (dailyMap.get(entry.date) || 0) + entry.downloads);
          }
        }
        const downloads = Array.from(dailyMap.entries())
          .map(([date, downloads]) => ({ date, downloads }))
          .sort((a, b) => a.date.localeCompare(b.date));
        if (downloads.length > 0) {
          crossRegistryDownloads = downloads;
        }
      }
    } catch {
      // Package doesn't exist on PyPI - that's fine
    }

    return (
      <PackageView
        stats={stats}
        info={info}
        registry="npm"
        crossRegistryDownloads={crossRegistryDownloads}
      />
    );
  } catch {
    notFound();
  }
}

export default async function NpmPackagePage({ params }: PageProps) {
  const { name } = await params;

  return (
    <Suspense fallback={<PackageViewSkeleton />}>
      <PackageData name={decodeURIComponent(name)} />
    </Suspense>
  );
}
