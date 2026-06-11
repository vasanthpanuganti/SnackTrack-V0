import { apiClient } from "./client";
import type {
  ApiResponse,
  DailyNutritionSummary,
  WeeklyNutritionSummary,
} from "@/types";

export const nutritionApi = {
  getDaily: async (date: string) => {
    const response = await apiClient.get<ApiResponse<DailyNutritionSummary>>(
      "/nutrition/daily",
      { params: { date } }
    );
    return response.data.data!;
  },

  getWeekly: async (week: string) => {
    const response = await apiClient.get<ApiResponse<WeeklyNutritionSummary>>(
      "/nutrition/weekly",
      { params: { week } }
    );
    return response.data.data!;
  },
};
