import { apiClient } from "./client";
import type { MealPlan } from "@/types";

interface MealPlanResponse {
  status: string;
  data: MealPlan;
  error: null;
}

interface MealPlansResponse {
  status: string;
  data: MealPlan[];
  error: null;
}

interface CreateMealPlanInput {
  name?: string;
  startDate: string;
  endDate: string;
  calorieTarget?: number;
  generateAuto?: boolean;
}

interface SwapMealInput {
  itemId: string;
  newRecipeId: string;
}

export const mealPlansApi = {
  getMealPlans: async () => {
    const response = await apiClient.get<MealPlansResponse>("/meal-plans");
    return response.data.data;
  },

  getMealPlan: async (id: string) => {
    const response = await apiClient.get<MealPlanResponse>(`/meal-plans/${id}`);
    return response.data.data;
  },

  createMealPlan: async (data: CreateMealPlanInput) => {
    const response = await apiClient.post<MealPlanResponse>("/meal-plans", data);
    return response.data.data;
  },

  updateMealPlan: async (id: string, data: Partial<MealPlan>) => {
    const response = await apiClient.put<MealPlanResponse>(
      `/meal-plans/${id}`,
      data
    );
    return response.data.data;
  },

  deleteMealPlan: async (id: string) => {
    await apiClient.delete(`/meal-plans/${id}`);
  },

  swapMeal: async (planId: string, data: SwapMealInput) => {
    const response = await apiClient.post<MealPlanResponse>(
      `/meal-plans/${planId}/swap`,
      data
    );
    return response.data.data;
  },
};
