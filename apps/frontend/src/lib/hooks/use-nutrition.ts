import { useQuery } from "@tanstack/react-query";
import { nutritionApi } from "../api/nutrition.api";

export function useDailyNutrition(date: string) {
  return useQuery({
    queryKey: ["nutrition", "daily", date],
    queryFn: () => nutritionApi.getDaily(date),
    enabled: !!date,
    staleTime: 60 * 1000,
  });
}

export function useWeeklyNutrition(weekStart: string) {
  return useQuery({
    queryKey: ["nutrition", "weekly", weekStart],
    queryFn: () => nutritionApi.getWeekly(weekStart),
    enabled: !!weekStart,
    staleTime: 5 * 60 * 1000,
  });
}
