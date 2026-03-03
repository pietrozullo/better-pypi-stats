import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function LegacyPackagePage({ params }: PageProps) {
  const { name } = await params;
  redirect(`/pypi/${encodeURIComponent(name)}`);
}
