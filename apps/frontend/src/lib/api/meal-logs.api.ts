import { apiClient } from "./client";
import type { ApiResponse, MealLog, MealType, MealLogSource } from "@/types";

export interface CreateMealLogInput {
  recipeId?: string | null;
  mealType: MealType;
  foodName: string;
  servings?: number;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  loggedAt?: string;
  source?: MealLogSource;
}

export interface MealLogListParams {
  /** YYYY-MM-DD anchor date for the range filter. */
  date?: string;
  range?: "day" | "week" | "month";
  cursor?: string;
  limit?: number;
}

export interface MealLogListResult {
  items: MealLog[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const mealLogsApi = {
  getMealLogs: async (params?: MealLogListParams) => {
    const response = await apiClient.get<ApiResponse<MealLogListResult>>(
      "/meal-logs",
      { params }
    );
    return response.data.data!;
  },

  createMealLog: async (data: CreateMealLogInput) => {
    const response = await apiClient.post<ApiResponse<MealLog>>(
      "/meal-logs",
      data
    );
    return response.data.data!;
  },

  deleteMealLog: async (id: string) => {
    await apiClient.delete(`/meal-logs/${id}`);
  },
};
