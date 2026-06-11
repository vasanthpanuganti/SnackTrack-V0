"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in the console for debugging; user sees a friendly screen
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </span>
      <h1 className="font-display text-3xl">Something burned in the kitchen</h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        An unexpected error occurred. Your data is safe — try again.
      </p>
      <Button onClick={reset} className="mt-8 rounded-full">
        Try again
      </Button>
    </div>
  );
}
