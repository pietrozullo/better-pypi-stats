import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPackageStats, getPackageInfo } from "@/lib/api";
import { PackageView } from "@/components/package/package-view";
import { PackageViewSkeleton } from "@/components/package/package-view-skeleton";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { name } = await params;
  return {
    title: `${name} - better-pypi-stats`,
    description: `Download statistics for ${name} Python package`,
  };
}

async function PackageData({ name }: { name: string }) {
  try {
    const [stats, info] = await Promise.all([
      getPackageStats(name),
      getPackageInfo(name),
    ]);

    return <PackageView stats={stats} info={info} />;
  } catch {
    notFound();
  }
}

export default async function PackagePage({ params }: PageProps) {
  const { name } = await params;

  return (
    <Suspense fallback={<PackageViewSkeleton />}>
      <PackageData name={decodeURIComponent(name)} />
    </Suspense>
  );
}
