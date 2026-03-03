import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPackageStats, getPackageInfo } from "@/lib/api";
import { getNpmDailyDownloads } from "@/lib/npm-api";
import { PackageView } from "@/components/package/package-view";
import { PackageViewSkeleton } from "@/components/package/package-view-skeleton";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { name } = await params;
  return {
    title: `${name} (PyPI) - better-stats`,
    description: `Download statistics for ${name} Python package`,
  };
}

async function PackageData({ name }: { name: string }) {
  try {
    const [stats, info] = await Promise.all([
      getPackageStats(name),
      getPackageInfo(name),
    ]);

    // Check if same package exists on npm
    let crossRegistryDownloads: { date: string; downloads: number }[] | undefined;
    try {
      const npmData = await getNpmDailyDownloads(name, 180);
      if (npmData.length > 0) {
        crossRegistryDownloads = npmData;
      }
    } catch {
      // Package doesn't exist on npm - that's fine
    }

    return (
      <PackageView
        stats={stats}
        info={info}
        registry="pypi"
        crossRegistryDownloads={crossRegistryDownloads}
      />
    );
  } catch {
    notFound();
  }
}

export default async function PyPIPackagePage({ params }: PageProps) {
  const { name } = await params;

  return (
    <Suspense fallback={<PackageViewSkeleton />}>
      <PackageData name={decodeURIComponent(name)} />
    </Suspense>
  );
}
