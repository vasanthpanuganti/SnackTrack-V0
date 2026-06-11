import { apiClient } from "./client";
import type { ApiResponse, Recipe, RecipeFilters } from "@/types";

export interface RecipeListResult {
  recipes: Recipe[];
  total: number;
  page: number;
  limit: number;
}

export interface RecommendationsResult extends RecipeListResult {
  recommendationMode: "personalized" | "general";
}

export const recipesApi = {
  getRecipes: async (filters?: RecipeFilters) => {
    const response = await apiClient.get<ApiResponse<RecipeListResult>>(
      "/recipes",
      { params: filters }
    );
    return response.data.data!;
  },

  getRecipe: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Recipe>>(`/recipes/${id}`);
    return response.data.data!;
  },

  getRecommendations: async (limit = 10) => {
    const response = await apiClient.get<ApiResponse<RecommendationsResult>>(
      "/recipes/recommendations",
      { params: { limit } }
    );
    return response.data.data!;
  },
};
