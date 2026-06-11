"use client";

import { Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { useRecommendations } from "@/lib/hooks/use-recipes";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { EmptyState } from "@/components/empty-state";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";

export default function RecommendationsPage() {
  const { data, isLoading, isFetching } = useRecommendations(12);
  const queryClient = useQueryClient();

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["recipes", "recommendations"] });

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">For you</h1>
          <p className="mt-1 flex items-center gap-2 text-muted-foreground">
            Recipes ranked by your taste profile.
            {data?.recommendationMode === "personalized" ? (
              <Badge variant="soft">
                <Sparkles className="h-3 w-3" /> Personalized
              </Badge>
            ) : data ? (
              <Badge variant="outline">Popular picks</Badge>
            ) : null}
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={refresh}
          disabled={isFetching}
        >
          <RefreshCcw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
          ))}
        </div>
      ) : data?.recipes?.length ? (
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.recipes.map((recipe, index) => (
            <StaggerItem key={recipe.id}>
              <RecipeCard recipe={recipe} priority={index < 3} />
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Your taste profile is warming up"
          description="Log meals and explore recipes — recommendations sharpen with every interaction."
        />
      )}
    </PageTransition>
  );
}
