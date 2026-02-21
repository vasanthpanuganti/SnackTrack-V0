"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMealLogs } from "@/lib/hooks/use-meal-logs";
import { useRecommendations } from "@/lib/hooks/use-recipes";
import { Calendar, TrendingUp, Target, Apple } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function DashboardPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: logs, isLoading: logsLoading } = useMealLogs({
    startDate: today,
    endDate: today,
  });
  const { data: recommendations, isLoading: recsLoading } = useRecommendations(4);

  // Calculate today's totals
  const todayTotals = logs?.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.proteinG || 0),
      carbs: acc.carbs + (log.carbsG || 0),
      fat: acc.fat + (log.fatG || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ) || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const calorieTarget = 2000; // TODO: Get from user preferences

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s your nutrition overview for today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Calories
            </CardTitle>
            <Apple className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {Math.round(todayTotals.calories)}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {calorieTarget} goal
                </p>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min((todayTotals.calories / calorieTarget) * 100, 100)}%`,
                    }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protein</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {Math.round(todayTotals.protein)}g
                </div>
                <p className="text-xs text-muted-foreground">of 150g goal</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carbs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {Math.round(todayTotals.carbs)}g
                </div>
                <p className="text-xs text-muted-foreground">of 250g goal</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fat</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {Math.round(todayTotals.fat)}g
                </div>
                <p className="text-xs text-muted-foreground">of 65g goal</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to help you stay on track
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/dashboard/meal-logs">
                <Apple className="mr-2 h-4 w-4" />
                Log a Meal
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/dashboard/recipes">
                <Target className="mr-2 h-4 w-4" />
                Browse Recipes
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/dashboard/meal-plans">
                <Calendar className="mr-2 h-4 w-4" />
                View Meal Plan
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended for You</CardTitle>
            <CardDescription>
              AI-powered recipe suggestions based on your preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recommendations?.recipes?.length ? (
              <div className="space-y-2">
                {recommendations.recipes.slice(0, 3).map((recipe) => (
                  <Link
                    key={recipe.id}
                    href={`/dashboard/recipes/${recipe.id}`}
                    className="block p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">{recipe.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {recipe.calories ? `${Math.round(recipe.calories)} cal` : "N/A"} ·{" "}
                      {recipe.readyInMinutes || "N/A"} min
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recommendations available yet
              </p>
            )}
            <Button className="w-full mt-4" variant="outline" asChild>
              <Link href="/dashboard/recommendations">View All</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

