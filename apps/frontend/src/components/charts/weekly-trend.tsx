"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendPoint {
  day: string;
  calories: number;
}

/**
 * 7-day calorie area chart. Loaded lazily (next/dynamic) so recharts stays
 * out of the dashboard's First Load JS.
 */
export default function WeeklyTrend({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="calFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
          <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={48} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(value: number) => [`${value} kcal`, "Calories"]}
          />
          <Area
            type="monotone"
            dataKey="calories"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#calFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
