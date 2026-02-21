import { apiClient } from "./client";
import type { MealLog } from "@/types";

interface MealLogResponse {
  status: string;
  data: MealLog;
  error: null;
}

interface MealLogsResponse {
  status: string;
  data: MealLog[];
  error: null;
}

interface CreateMealLogInput {
  recipeId?: string;
  mealType: string;
  foodName: string;
  servings: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  loggedAt?: string;
}

export const mealLogsApi = {
  getMealLogs: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await apiClient.get<MealLogsResponse>("/meal-logs", {
      params,
    });
    return response.data.data;
  },

  getMealLog: async (id: string) => {
    const response = await apiClient.get<MealLogResponse>(`/meal-logs/${id}`);
    return response.data.data;
  },

  createMealLog: async (data: CreateMealLogInput) => {
    const response = await apiClient.post<MealLogResponse>("/meal-logs", data);
    return response.data.data;
  },

  updateMealLog: async (id: string, data: Partial<MealLog>) => {
    const response = await apiClient.put<MealLogResponse>(
      `/meal-logs/${id}`,
      data
    );
    return response.data.data;
  },

  deleteMealLog: async (id: string) => {
    await apiClient.delete(`/meal-logs/${id}`);
  },
};
