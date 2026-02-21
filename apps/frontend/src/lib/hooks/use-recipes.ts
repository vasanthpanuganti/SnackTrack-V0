import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { recipesApi } from "../api/recipes.api";
import type { RecipeFilters } from "@/types";

export function useRecipes(filters?: RecipeFilters) {
  return useQuery({
    queryKey: ["recipes", filters],
    queryFn: () => recipesApi.getRecipes(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: ["recipes", id],
    queryFn: () => recipesApi.getRecipe(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useRecipeSearch(query: string, filters?: RecipeFilters) {
  return useQuery({
    queryKey: ["recipes", "search", query, filters],
    queryFn: () => recipesApi.searchRecipes(query, filters),
    enabled: query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useRecommendations(limit = 10) {
  return useQuery({
    queryKey: ["recipes", "recommendations", limit],
    queryFn: () => recipesApi.getRecommendations(limit),
    staleTime: 10 * 60 * 1000,
  });
}
