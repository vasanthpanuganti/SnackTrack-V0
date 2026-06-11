import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { recipesApi } from "../api/recipes.api";
import type { RecipeFilters } from "@/types";

export function useRecipes(filters?: RecipeFilters) {
  return useQuery({
    queryKey: ["recipes", "list", filters],
    queryFn: () => recipesApi.getRecipes(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: ["recipes", "detail", id],
    queryFn: () => recipesApi.getRecipe(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useRecommendations(limit = 10) {
  return useQuery({
    queryKey: ["recipes", "recommendations", limit],
    queryFn: () => recipesApi.getRecommendations(limit),
    staleTime: 10 * 60 * 1000,
  });
}
