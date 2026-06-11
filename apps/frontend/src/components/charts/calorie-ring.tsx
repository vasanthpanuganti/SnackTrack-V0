"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/** Animated SVG radial gauge for daily calories. */
export function CalorieRing({
  consumed,
  target,
  size = 168,
  strokeWidth = 13,
  className,
}: CalorieRingProps) {
  const reduce = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target > 0 ? consumed / target : 0;
  const progress = Math.min(ratio, 1);
  const over = ratio > 1;
  const remaining = Math.max(0, Math.round(target - consumed));

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={over ? "var(--warning)" : "var(--primary)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums tracking-tight">
          {Math.round(consumed).toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">
          {over
            ? `${Math.round(consumed - target).toLocaleString()} over target`
            : `${remaining.toLocaleString()} kcal left`}
        </span>
      </div>
    </div>
  );
}
