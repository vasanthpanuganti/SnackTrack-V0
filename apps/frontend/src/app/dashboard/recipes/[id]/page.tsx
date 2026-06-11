"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Flame,
  Plus,
  Users,
} from "lucide-react";

import { useRecipe } from "@/lib/hooks/use-recipes";
import { useCreateMealLog } from "@/lib/hooks/use-meal-logs";
import { useUserProfile } from "@/lib/hooks/use-user";
import { MEAL_TYPE_META } from "@/lib/constants";
import type { MealType } from "@/types";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FoodImage } from "@/components/food-image";
import { EmptyState } from "@/components/empty-state";
import { PageTransition, FadeIn } from "@/components/motion";

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: recipe, isLoading, isError } = useRecipe(id);
  const { data: profile } = useUserProfile();
  const createLog = useCreateMealLog();

  const [logOpen, setLogOpen] = useState(false);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [servings, setServings] = useState("1");

  const allergenWarnings = useMemo(() => {
    if (!recipe || !profile?.allergens?.length) return [];
    const mine = new Set(
      profile.allergens.map((a) => a.allergenType.toLowerCase())
    );
    return recipe.allergens.filter((a) => mine.has(a.toLowerCase()));
  }, [recipe, profile]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <Skeleton className="h-8 w-2/3" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !recipe) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Recipe not found"
        description="It may have expired from the catalog."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/recipes">
              <ArrowLeft className="h-4 w-4" /> Back to recipes
            </Link>
          </Button>
        }
      />
    );
  }

  const macros = [
    { label: "Calories", value: recipe.calories, unit: "kcal" },
    { label: "Protein", value: recipe.proteinG, unit: "g" },
    { label: "Carbs", value: recipe.carbsG, unit: "g" },
    { label: "Fat", value: recipe.fatG, unit: "g" },
    { label: "Fiber", value: recipe.fiberG, unit: "g" },
    { label: "Sugar", value: recipe.sugarG, unit: "g" },
  ].filter((m) => m.value != null);

  const handleLog = () => {
    createLog.mutate(
      {
        recipeId: recipe.id,
        mealType,
        foodName: recipe.title,
        servings: Number(servings) || 1,
        calories: recipe.calories,
        proteinG: recipe.proteinG,
        carbsG: recipe.carbsG,
        fatG: recipe.fatG,
        source: "search",
      },
      { onSuccess: () => setLogOpen(false) }
    );
  };

  return (
    <PageTransition className="space-y-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/recipes">
          <ArrowLeft className="h-4 w-4" /> All recipes
        </Link>
      </Button>

      {/* Hero */}
      <div className="relative h-72 overflow-hidden rounded-3xl md:h-96">
        <FoodImage
          src={recipe.imageUrl ?? recipe.cloudinaryUrl}
          alt={recipe.title}
          priority
          sizes="(max-width: 1024px) 100vw, 896px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
          <div className="mb-3 flex flex-wrap gap-2">
            {recipe.dietLabels.slice(0, 4).map((label) => (
              <Badge key={label} variant="soft" className="glass border-white/20 capitalize">
                {label}
              </Badge>
            ))}
          </div>
          <h1 className="font-display text-3xl text-white md:text-5xl">
            {recipe.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-5 text-sm text-white/85">
            {recipe.readyInMinutes != null && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {recipe.readyInMinutes} min
              </span>
            )}
            {recipe.servings != null && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {recipe.servings} servings
              </span>
            )}
            {recipe.calories != null && (
              <span className="flex items-center gap-1.5">
                <Flame className="h-4 w-4" /> {Math.round(recipe.calories)} kcal / serving
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Allergen warning */}
      {allergenWarnings.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Heads up — contains your allergens</p>
            <p className="text-sm text-muted-foreground">
              This recipe lists{" "}
              <span className="font-medium capitalize">
                {allergenWarnings.join(", ").replaceAll("_", " ")}
              </span>
              , which you&apos;ve flagged in your profile.
            </p>
          </div>
        </div>
      )}

      {/* Log CTA + macros */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Dialog open={logOpen} onOpenChange={setLogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-full">
              <Plus className="h-4 w-4" /> Log this meal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Log “{recipe.title}”</DialogTitle>
              <DialogDescription>
                Adds this recipe to today&apos;s diary with its nutrition.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Meal</Label>
                <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MEAL_TYPE_META) as MealType[]).map((type) => (
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
                  min="0.5"
                  step="0.5"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleLog} disabled={createLog.isPending} className="w-full">
                {createLog.isPending ? "Logging…" : "Add to diary"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {recipe.cuisineTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipe.cuisineTypes.slice(0, 3).map((cuisine) => (
              <Badge key={cuisine} variant="outline" className="capitalize">
                {cuisine}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {macros.length > 0 && (
        <FadeIn>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {macros.map((macro) => (
              <Card key={macro.label} className="rounded-2xl text-center">
                <CardContent className="p-4">
                  <p className="text-xl font-bold tabular-nums">
                    {Math.round(macro.value!)}
                    <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                      {macro.unit}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{macro.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </FadeIn>
      )}

      {/* Ingredients & instructions */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.ingredients?.length ? (
              <ul className="space-y-2.5">
                {recipe.ingredients.map((ingredient, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{ingredient.original || ingredient.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ingredient details aren&apos;t available for this recipe.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.instructions?.length ? (
              <ol className="space-y-5">
                {recipe.instructions.map((step) => (
                  <li key={step.number} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {step.number}
                    </span>
                    <p className="pt-0.5 text-sm leading-relaxed">{step.step}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                No step-by-step instructions available for this recipe.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
