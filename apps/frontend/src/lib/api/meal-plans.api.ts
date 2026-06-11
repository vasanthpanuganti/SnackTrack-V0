import { apiClient } from "./client";
import type { ApiResponse, MealPlan, MealPlanItem, MealType } from "@/types";

export interface GenerateMealPlanInput {
  type: "daily" | "weekly";
  /** YYYY-MM-DD start date; defaults to today on the backend. */
  date?: string;
}

export interface SwapMealInput {
  mealSlot: { dayNumber: number; mealType: MealType };
  rejectedRecipeId: string;
}

export interface UpdateMealPlanInput {
  name?: string;
  status?: "active" | "archived" | "draft";
}

export interface MealPlanListResult {
  items: MealPlan[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const mealPlansApi = {
  getMealPlans: async (params?: { cursor?: string; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<MealPlanListResult>>(
      "/meal-plans",
      { params }
    );
    return response.data.data!;
  },

  getMealPlan: async (id: string) => {
    const response = await apiClient.get<ApiResponse<MealPlan>>(
      `/meal-plans/${id}`
    );
    return response.data.data!;
  },

  generateMealPlan: async (data: GenerateMealPlanInput) => {
    const response = await apiClient.post<ApiResponse<MealPlan>>(
      "/meal-plans/generate",
      data
    );
    return response.data.data!;
  },

  updateMealPlan: async (id: string, data: UpdateMealPlanInput) => {
    const response = await apiClient.patch<ApiResponse<MealPlan>>(
      `/meal-plans/${id}`,
      data
    );
    return response.data.data!;
  },

  deleteMealPlan: async (id: string) => {
    await apiClient.delete(`/meal-plans/${id}`);
  },

  swapMeal: async (planId: string, data: SwapMealInput) => {
    const response = await apiClient.post<ApiResponse<MealPlanItem>>(
      `/meal-plans/${planId}/swap`,
      data
    );
    return response.data.data!;
  },
};
