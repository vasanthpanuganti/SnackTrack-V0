import { apiClient } from "./client";
import type { Recipe, RecipeFilters } from "@/types";

interface RecipesResponse {
  status: string;
  data: {
    recipes: Recipe[];
    total: number;
    page: number;
    limit: number;
  };
  error: null;
}

interface RecipeResponse {
  status: string;
  data: Recipe;
  error: null;
}

export const recipesApi = {
  getRecipes: async (filters?: RecipeFilters) => {
    const { search, ...restFilters } = filters ?? {};
    const response = await apiClient.get<RecipesResponse>(
      search ? "/recipes/search" : "/recipes",
      {
        params: search ? { q: search, ...restFilters } : restFilters,
      }
    );
    return response.data.data;
  },

  searchRecipes: async (query: string, filters?: RecipeFilters) => {
    const response = await apiClient.get<RecipesResponse>("/recipes/search", {
      params: { q: query, ...filters },
    });
    return response.data.data;
  },

  getRecipe: async (id: string) => {
    const response = await apiClient.get<RecipeResponse>(`/recipes/${id}`);
    return response.data.data;
  },

  getRecommendations: async (limit = 10) => {
    const response = await apiClient.get<RecipesResponse>(
      "/recipes/recommendations",
      {
        params: { limit },
      }
    );
    return response.data.data;
  },
};
