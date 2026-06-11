"use client";

import { useState } from "react";
import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const SHIMMER_BLUR =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="#e8efe9"/></svg>`
  );

interface FoodImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * Recipe imagery with a graceful branded fallback when a photo is missing
 * or fails to load — no broken-image icons, ever.
 */
export function FoodImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
}: FoodImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-gradient-to-br from-accent via-muted to-accent",
          className
        )}
        role="img"
        aria-label={alt}
      >
        <UtensilsCrossed className="h-8 w-8 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      placeholder="blur"
      blurDataURL={SHIMMER_BLUR}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
