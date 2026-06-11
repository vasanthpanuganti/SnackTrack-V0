"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0..100; values above 100 render full with the overflow color. */
  value: number;
  indicatorClassName?: string;
}

/** Animated determinate progress bar. */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, indicatorClassName, ...props }, ref) => {
    const reduce = useReducedMotion();
    const clamped = Math.max(0, Math.min(value, 100));
    const over = value > 100;

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        className={cn(
          "h-2 w-full overflow-hidden rounded-full bg-muted",
          className
        )}
        {...props}
      >
        <motion.div
          className={cn(
            "h-full rounded-full",
            over ? "bg-warning" : "bg-primary",
            indicatorClassName
          )}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
