"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, addDays, isToday } from "date-fns";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { useMealLogs, useCreateMealLog, useDeleteMealLog } from "@/lib/hooks/use-meal-logs";
import { useDailyNutrition } from "@/lib/hooks/use-nutrition";
import { useFoodSearch } from "@/lib/hooks/use-food-search";
import { formatDateKey } from "@/lib/nutrition";
import { MEAL_TYPE_META, defaultMealType } from "@/lib/constants";
import type { MealLog, MealType } from "@/types";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/motion";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

interface DraftLog {
  foodName: string;
  mealType: MealType;
  servings: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
}

const emptyDraft = (mealType: MealType = "breakfast"): DraftLog => ({
  foodName: "",
  mealType,
  servings: "1",
  calories: "",
  proteinG: "",
  carbsG: "",
  fatG: "",
});

function MealLogsDiary() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [date, setDate] = useState(() => new Date());
  const dateKey = useMemo(() => formatDateKey(date), [date]);

  const { data: logs, isLoading } = useMealLogs({ date: dateKey, range: "day", limit: 100 });
  const { data: daily } = useDailyNutrition(dateKey);
  const createLog = useCreateMealLog();
  const deleteLog = useDeleteMealLog();

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<DraftLog>(emptyDraft());
  const [foodQuery, setFoodQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MealLog | null>(null);

  const { data: foodResults, isFetching: searching } = useFoodSearch(foodQuery);

  // "Log a meal" CTAs elsewhere deep-link here with ?add=1 — open the dialog
  // immediately (meal pre-picked by time of day) instead of a second click.
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setDraft(emptyDraft(defaultMealType()));
      setFoodQuery("");
      setAddOpen(true);
      router.replace("/dashboard/meal-logs", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const grouped = useMemo(() => {
    const byType = new Map<MealType, MealLog[]>();
    for (const log of logs?.items ?? []) {
      const list = byType.get(log.mealType) ?? [];
      list.push(log);
      byType.set(log.mealType, list);
    }
    return byType;
  }, [logs]);

  const openAdd = (mealType: MealType) => {
    setDraft(emptyDraft(mealType));
    setFoodQuery("");
    setAddOpen(true);
  };

  const applyFoodResult = (result: {
    name: string;
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
  }) => {
    setDraft((d) => ({
      ...d,
      foodName: result.name,
      calories: result.calories != null ? String(Math.round(result.calories)) : d.calories,
      proteinG: result.proteinG != null ? String(Math.round(result.proteinG)) : d.proteinG,
      carbsG: result.carbsG != null ? String(Math.round(result.carbsG)) : d.carbsG,
      fatG: result.fatG != null ? String(Math.round(result.fatG)) : d.fatG,
    }));
    setFoodQuery("");
  };

  const numOrNull = (value: string) =>
    value.trim() === "" ? null : Number(value);

  const submit = () => {
    if (!draft.foodName.trim()) return;
    // Anchor the log at noon local on the selected day so it lands in the
    // right diary bucket regardless of the current wall-clock time.
    const loggedAt = new Date(date);
    loggedAt.setHours(12, 0, 0, 0);

    createLog.mutate(
      {
        foodName: draft.foodName.trim(),
        mealType: draft.mealType,
        // Clamp to the API's accepted range; free-text input can hold anything
        servings: Math.min(99, Math.max(0.1, Number(draft.servings) || 1)),
        calories: numOrNull(draft.calories),
        proteinG: numOrNull(draft.proteinG),
        carbsG: numOrNull(draft.carbsG),
        fatG: numOrNull(draft.fatG),
        loggedAt: loggedAt.toISOString(),
        source: "manual",
      },
      { onSuccess: () => setAddOpen(false) }
    );
  };

  const consumed = daily?.consumed;

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Meal diary</h1>
          <p className="mt-1 text-muted-foreground">
            Everything you&apos;ve eaten, day by day.
          </p>
        </div>
        <Button className="rounded-full" onClick={() => openAdd(defaultMealType())}>
          <Plus className="h-4 w-4" /> Add food
        </Button>
      </div>

      {/* Date navigator + day summary */}
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-5">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => setDate((d) => addDays(d, -1))}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-44 text-center">
              <p className="font-semibold">
                {isToday(date) ? "Today" : format(date, "EEEE")}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(date, "MMMM d, yyyy")}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => setDate((d) => addDays(d, 1))}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday(date) && (
              <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>
                <CalendarDays className="h-4 w-4" /> Today
              </Button>
            )}
          </div>

          {consumed && (
            <div className="flex gap-5 text-sm tabular-nums">
              <span>
                <strong>{Math.round(consumed.calories)}</strong>{" "}
                <span className="text-muted-foreground">kcal</span>
              </span>
              <span>
                <strong>{Math.round(consumed.proteinG)}g</strong>{" "}
                <span className="text-muted-foreground">protein</span>
              </span>
              <span>
                <strong>{Math.round(consumed.carbsG)}g</strong>{" "}
                <span className="text-muted-foreground">carbs</span>
              </span>
              <span>
                <strong>{Math.round(consumed.fatG)}g</strong>{" "}
                <span className="text-muted-foreground">fat</span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meal sections */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : (logs?.items?.length ?? 0) === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={`Nothing logged ${isToday(date) ? "today" : "on this day"}`}
          description="Add a food manually or search the database to autofill nutrition."
          action={
            <Button onClick={() => openAdd(defaultMealType())}>
              <Plus className="h-4 w-4" /> Add food
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {MEAL_ORDER.map((mealType) => {
            const items = grouped.get(mealType) ?? [];
            const subtotal = items.reduce(
              (sum, log) => sum + (log.calories ?? 0) * log.servings,
              0
            );
            return (
              <Card key={mealType} className="rounded-2xl">
                <CardHeader className="flex-row items-center justify-between py-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span aria-hidden>{MEAL_TYPE_META[mealType].emoji}</span>
                    {MEAL_TYPE_META[mealType].label}
                    {subtotal > 0 && (
                      <Badge variant="soft" className="ml-1 tabular-nums">
                        {Math.round(subtotal)} kcal
                      </Badge>
                    )}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openAdd(mealType)}
                    aria-label={`Add ${mealType}`}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </CardHeader>
                {items.length > 0 && (
                  <CardContent className="space-y-2 pt-0">
                    {items.map((log) => (
                      <div
                        key={log.id}
                        className="group flex items-center justify-between rounded-xl border px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{log.foodName}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {log.servings} serving{log.servings !== 1 ? "s" : ""}
                            {log.calories != null &&
                              ` · ${Math.round(log.calories * log.servings)} kcal`}
                            {log.proteinG != null &&
                              ` · ${Math.round(log.proteinG * log.servings)}g protein`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground opacity-60 transition-opacity hover:text-destructive group-hover:opacity-100"
                          onClick={() => setDeleteTarget(log)}
                          aria-label={`Delete ${log.foodName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add food dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add food</DialogTitle>
            <DialogDescription>
              Search the food database to autofill macros, or enter them manually.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search foods (e.g. greek yogurt)…"
                className="pl-9"
                value={foodQuery}
                onChange={(e) => setFoodQuery(e.target.value)}
              />
              {foodQuery.trim().length > 1 && (
                <div className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-lg">
                  {searching ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
                  ) : foodResults?.length ? (
                    foodResults.map((result) => (
                      <button
                        key={`${result.source}-${result.sourceId}`}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                        onClick={() => applyFoodResult(result)}
                      >
                        <span className="truncate">{result.name}</span>
                        {result.calories != null && (
                          <span className="ml-2 shrink-0 text-xs tabular-nums text-muted-foreground">
                            {Math.round(result.calories)} kcal
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No matches</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="foodName">Food name</Label>
              <Input
                id="foodName"
                value={draft.foodName}
                onChange={(e) => setDraft({ ...draft, foodName: e.target.value })}
                placeholder="Grilled chicken salad"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Meal</Label>
                <Select
                  value={draft.mealType}
                  onValueChange={(v) => setDraft({ ...draft, mealType: v as MealType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_ORDER.map((type) => (
                      <SelectItem key={type} value={type}>
                        {MEAL_TYPE_META[type].emoji} {MEAL_TYPE_META[type].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="servings">Servings</Label>
                <Input
                  id="servings"
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={draft.servings}
                  onChange={(e) => setDraft({ ...draft, servings: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {(
                [
                  ["calories", "kcal"],
                  ["proteinG", "Protein"],
                  ["carbsG", "Carbs"],
                  ["fatG", "Fat"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="grid gap-2">
                  <Label htmlFor={key} className="text-xs">
                    {label}
                  </Label>
                  <Input
                    id={key}
                    type="number"
                    min="0"
                    value={draft[key]}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full"
              onClick={submit}
              disabled={createLog.isPending || !draft.foodName.trim()}
            >
              {createLog.isPending ? "Adding…" : "Add to diary"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{deleteTarget?.foodName}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the entry from your diary and updates today&apos;s totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteLog.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}

export default function MealLogsPage() {
  // useSearchParams requires a Suspense boundary during prerender
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <MealLogsDiary />
    </Suspense>
  );
}
