import Link from "next/link";
import { ArrowLeft, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PackageNotFound() {
  return (
    <div className="flex flex-col items-center justify-center pt-24 text-center">
      <div className="rounded-full bg-secondary p-4">
        <PackageX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-xl font-bold">Package Not Found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The PyPI package you&apos;re looking for doesn&apos;t exist or has no download data.
      </p>
      <Button variant="outline" className="mt-6" asChild>
        <Link href="/">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to search
        </Link>
      </Button>
    </div>
  );
}
