"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, addDays } from "date-fns";
import {
  Calendar,
  CalendarRange,
  Loader2,
  RefreshCcw,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  useMealPlans,
  useGenerateMealPlan,
  useDeleteMealPlan,
  useSwapMeal,
} from "@/lib/hooks/use-meal-plans";
import { MEAL_TYPE_META } from "@/lib/constants";
import { formatDateKey } from "@/lib/nutrition";
import type { MealPlan, MealPlanItem } from "@/types";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FoodImage } from "@/components/food-image";
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/motion";

function PlanItemRow({
  plan,
  item,
}: {
  plan: MealPlan;
  item: MealPlanItem;
}) {
  const swap = useSwapMeal();
  const isSwapping =
    swap.isPending &&
    swap.variables?.data.mealSlot.dayNumber === item.dayNumber &&
    swap.variables?.data.mealSlot.mealType === item.mealType;

  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
        <FoodImage
          src={item.recipe.imageUrl ?? item.recipe.cloudinaryUrl}
          alt={item.recipe.title}
          sizes="56px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {MEAL_TYPE_META[item.mealType]?.emoji}{" "}
          {MEAL_TYPE_META[item.mealType]?.label ?? item.mealType}
          {item.isSwapped && (
            <Badge variant="soft" className="ml-2 align-middle">
              swapped
            </Badge>
          )}
        </p>
        <Link
          href={`/dashboard/recipes/${item.recipe.id}`}
          className="line-clamp-1 text-sm font-medium hover:underline"
        >
          {item.recipe.title}
        </Link>
        <p className="text-xs tabular-nums text-muted-foreground">
          {item.recipe.calories != null && `${Math.round(item.recipe.calories)} kcal`}
          {item.recipe.readyInMinutes != null && ` · ${item.recipe.readyInMinutes} min`}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Swap ${item.recipe.title}`}
        title="Swap for another recipe"
        disabled={isSwapping}
        onClick={() =>
          swap.mutate({
            planId: plan.id,
            data: {
              mealSlot: { dayNumber: item.dayNumber, mealType: item.mealType },
              rejectedRecipeId: item.recipe.id,
            },
          })
        }
      >
        {isSwapping ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCcw className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function PlanCard({ plan }: { plan: MealPlan }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deletePlan = useDeleteMealPlan();

  const days = useMemo(() => {
    const map = new Map<number, MealPlanItem[]>();
    for (const item of plan.items) {
      const list = map.get(item.dayNumber) ?? [];
      list.push(item);
      map.set(item.dayNumber, list);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [plan.items]);

  const startDate = new Date(`${plan.startDate}T00:00:00`);
  const isWeekly = days.length > 1;

  return (
    <Card className="rounded-2xl">
      <CardHeader
        className="cursor-pointer select-none flex-row items-center justify-between gap-3 py-4"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            {isWeekly ? <CalendarRange className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
          </span>
          <div>
            <CardTitle className="text-base">
              {plan.name ?? (isWeekly ? "Weekly plan" : "Daily plan")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {format(startDate, "MMM d")}
              {isWeekly && ` – ${format(new Date(`${plan.endDate}T00:00:00`), "MMM d")}`}
              {plan.calorieTarget && ` · ~${plan.calorieTarget} kcal/day`}
              {` · ${plan.items.length} meals`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={plan.status === "active" ? "soft" : "outline"} className="capitalize">
            {plan.status}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete plan"
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 pt-0">
          {days.map(([dayNumber, items]) => (
            <div key={dayNumber}>
              {isWeekly && (
                <p className="mb-2 text-sm font-semibold">
                  {format(addDays(startDate, dayNumber - 1), "EEEE, MMM d")}
                </p>
              )}
              <div className={cn("grid gap-3", "md:grid-cols-3")}>
                {items
                  .slice()
                  .sort(
                    (a, b) =>
                      (MEAL_TYPE_META[a.mealType]?.order ?? 9) -
                      (MEAL_TYPE_META[b.mealType]?.order ?? 9)
                  )
                  .map((item) => (
                    <PlanItemRow key={item.id} plan={plan} item={item} />
                  ))}
              </div>
            </div>
          ))}
        </CardContent>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this meal plan?</AlertDialogTitle>
            <AlertDialogDescription>
              The plan and its scheduled meals will be removed. Logged meals stay in your diary.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePlan.mutate(plan.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function MealPlansPage() {
  const { data, isLoading } = useMealPlans();
  const generate = useGenerateMealPlan();

  const [genOpen, setGenOpen] = useState(false);
  const [planType, setPlanType] = useState<"daily" | "weekly">("daily");

  const handleGenerate = () => {
    generate.mutate(
      { type: planType, date: formatDateKey(new Date()) },
      { onSuccess: () => setGenOpen(false) }
    );
  };

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Meal plans</h1>
          <p className="mt-1 text-muted-foreground">
            Auto-generated plans that respect your diet, allergens, and calorie target.
          </p>
        </div>
        <Button className="rounded-full" onClick={() => setGenOpen(true)}>
          <Sparkles className="h-4 w-4" /> Generate plan
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : data?.items?.length ? (
        <div className="space-y-4">
          {data.items.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="No meal plans yet"
          description="Generate your first plan — we'll match recipes to your calorie target and skip your allergens."
          action={
            <Button onClick={() => setGenOpen(true)}>
              <Sparkles className="h-4 w-4" /> Generate plan
            </Button>
          }
        />
      )}

      {/* Generate dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate a meal plan</DialogTitle>
            <DialogDescription>
              Starting today, built from recipes that match your preferences.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {(
              [
                { value: "daily", label: "Daily", hint: "3 meals for today", icon: Calendar },
                { value: "weekly", label: "Weekly", hint: "21 meals, 7 days", icon: CalendarRange },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => setPlanType(option.value)}
                aria-pressed={planType === option.value}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-colors",
                  planType === option.value
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/40"
                )}
              >
                <option.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={handleGenerate} disabled={generate.isPending}>
              {generate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Cooking up your plan…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
