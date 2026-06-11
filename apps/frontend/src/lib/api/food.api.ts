import { apiClient } from "./client";
import type { ApiResponse, FoodSearchResult } from "@/types";

export const foodApi = {
  /** Unified food search (Spoonacular + USDA) with macros for quick logging. */
  search: async (q: string, limit = 10) => {
    const response = await apiClient.get<ApiResponse<FoodSearchResult[]>>(
      "/food/search",
      { params: { q, limit } }
    );
    return response.data.data!;
  },
};
