import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getNpmPackageStats, getNpmPackageInfo } from "@/lib/npm-api";
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

    return <PackageView stats={stats} info={info} registry="npm" />;
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
