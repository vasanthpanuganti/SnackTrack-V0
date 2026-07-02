"use client";

import { useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ChefHat,
  Plus,
  Sparkles,
} from "lucide-react";

// recharts is heavy; keep it out of the dashboard's First Load JS and let
// the chart hydrate after the page is interactive.
const WeeklyTrend = dynamic(() => import("@/components/charts/weekly-trend"), {
  ssr: false,
  loading: () => <div className="h-36 animate-pulse rounded-xl bg-muted" />,
});

import { useAuthStore } from "@/lib/store/auth-store";
import { useUserProfile } from "@/lib/hooks/use-user";
import { useDailyNutrition, useWeeklyNutrition } from "@/lib/hooks/use-nutrition";
import { useMealLogs } from "@/lib/hooks/use-meal-logs";
import { useRecommendations } from "@/lib/hooks/use-recipes";
import { resolveTargets, formatDateKey } from "@/lib/nutrition";
import { MEAL_TYPE_META } from "@/lib/constants";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalorieRing } from "@/components/charts/calorie-ring";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { EmptyState } from "@/components/empty-state";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const today = useMemo(() => formatDateKey(new Date()), []);
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return formatDateKey(d);
  }, []);

  const { data: profile } = useUserProfile();
  const { data: daily, isLoading: dailyLoading } = useDailyNutrition(today);
  const { data: weekly } = useWeeklyNutrition(weekStart);
  const { data: logs, isLoading: logsLoading } = useMealLogs({
    date: today,
    range: "day",
    limit: 50,
  });
  const { data: recommendations, isLoading: recsLoading } =
    useRecommendations(3);

  const targets = resolveTargets(daily?.targets, profile);
  const consumed = daily?.consumed ?? {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };

  const macros = [
    { label: "Protein", value: consumed.proteinG, target: targets.proteinG, unit: "g" },
    { label: "Carbs", value: consumed.carbsG, target: targets.carbsG, unit: "g" },
    { label: "Fat", value: consumed.fatG, target: targets.fatG, unit: "g" },
  ];

  const trendData =
    weekly?.dailyBreakdown?.map((day) => ({
      day: format(new Date(`${day.date}T00:00:00`), "EEE"),
      calories: Math.round(day.consumed.calories),
    })) ?? [];

  const sortedLogs = [...(logs?.items ?? [])].sort(
    (a, b) =>
      (MEAL_TYPE_META[a.mealType]?.order ?? 9) -
      (MEAL_TYPE_META[b.mealType]?.order ?? 9)
  );

  return (
    <PageTransition className="space-y-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="font-display text-3xl md:text-4xl">
            {greeting()}
            {user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
            <span className="text-primary">.</span>
          </h1>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/dashboard/meal-logs?add=1">
            <Plus className="h-4 w-4" /> Log a meal
          </Link>
        </Button>
      </div>

      {/* Today's nutrition */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today&apos;s calories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 pb-8">
            {dailyLoading ? (
              <Skeleton className="h-40 w-40 rounded-full" />
            ) : (
              <CalorieRing consumed={consumed.calories} target={targets.calories} />
            )}
            <p className="text-xs text-muted-foreground">
              Target: {targets.calories.toLocaleString()} kcal
              {targets.estimated && " (estimated — set yours in Profile)"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Macronutrients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {macros.map((macro) => {
              const pct = macro.target > 0 ? (macro.value / macro.target) * 100 : 0;
              return (
                <div key={macro.label}>
                  <div className="mb-2 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{macro.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {Math.round(macro.value)} / {Math.round(macro.target)}
                      {macro.unit}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}

            {trendData.length > 0 && (
              <div className="pt-2">
                <p className="mb-2 text-sm font-medium">Last 7 days</p>
                <WeeklyTrend data={trendData} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's meals + shortcuts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">Today&apos;s meals</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/meal-logs">
                View diary <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : sortedLogs.length > 0 ? (
              <ul className="space-y-2.5">
                {sortedLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between rounded-xl border px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden className="text-lg">
                        {MEAL_TYPE_META[log.mealType]?.emoji ?? "🍽️"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{log.foodName}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {log.mealType}
                          {log.servings !== 1 && ` · ${log.servings} servings`}
                        </p>
                      </div>
                    </div>
                    {log.calories != null && (
                      <Badge variant="soft" className="shrink-0 tabular-nums">
                        {Math.round(log.calories * log.servings)} kcal
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="Nothing logged yet today"
                description="Log your first meal to see calories and macros build up here."
                action={
                  <Button asChild size="sm">
                    <Link href="/dashboard/meal-logs?add=1">
                      <Plus className="h-4 w-4" /> Log a meal
                    </Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button className="justify-start" variant="outline" asChild>
              <Link href="/dashboard/recipes">
                <ChefHat className="h-4 w-4" /> Browse recipes
              </Link>
            </Button>
            <Button className="justify-start" variant="outline" asChild>
              <Link href="/dashboard/meal-plans">
                <Calendar className="h-4 w-4" /> Generate a meal plan
              </Link>
            </Button>
            <Button className="justify-start" variant="outline" asChild>
              <Link href="/dashboard/recommendations">
                <Sparkles className="h-4 w-4" /> Picks for you
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Recommended for you</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/recommendations">
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {recsLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        ) : recommendations?.recipes?.length ? (
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.recipes.slice(0, 3).map((recipe) => (
              <StaggerItem key={recipe.id}>
                <RecipeCard recipe={recipe} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="No recommendations yet"
            description="Browse and log a few recipes — the recommender learns your taste as you go."
          />
        )}
      </section>
    </PageTransition>
  );
}
