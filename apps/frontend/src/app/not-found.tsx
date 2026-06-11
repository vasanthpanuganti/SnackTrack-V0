import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
        <UtensilsCrossed className="h-8 w-8 text-accent-foreground" />
      </span>
      <h1 className="font-display text-5xl">404</h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        This plate is empty — the page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button asChild className="mt-8 rounded-full">
        <Link href="/">Back to SnackTrack</Link>
      </Button>
    </div>
  );
}
