"use client";

import Link from "next/link";
import { Clock, Flame, Users } from "lucide-react";
import type { Recipe } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FoodImage } from "@/components/food-image";
import { HoverLift } from "@/components/motion";

export function RecipeCard({
  recipe,
  priority = false,
}: {
  recipe: Recipe;
  priority?: boolean;
}) {
  return (
    <HoverLift>
      <Link
        href={`/dashboard/recipes/${recipe.id}`}
        className="block h-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
      >
        <Card className="group h-full overflow-hidden rounded-2xl border-border/70 transition-shadow hover:shadow-lg">
          <div className="relative aspect-[4/3] overflow-hidden">
            <FoodImage
              src={recipe.imageUrl ?? recipe.cloudinaryUrl}
              alt={recipe.title}
              priority={priority}
              className="transition-transform duration-500 group-hover:scale-[1.04]"
            />
            {recipe.dietLabels.length > 0 && (
              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                {recipe.dietLabels.slice(0, 2).map((label) => (
                  <Badge
                    key={label}
                    variant="soft"
                    className="glass border-white/20 capitalize"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2.5 p-4">
            <h3 className="line-clamp-2 font-semibold leading-snug">
              {recipe.title}
            </h3>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {recipe.readyInMinutes != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {recipe.readyInMinutes} min
                </span>
              )}
              {recipe.calories != null && (
                <span className="flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" />
                  {Math.round(recipe.calories)} kcal
                </span>
              )}
              {recipe.servings != null && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {recipe.servings}
                </span>
              )}
            </div>
          </div>
        </Card>
      </Link>
    </HoverLift>
  );
}
