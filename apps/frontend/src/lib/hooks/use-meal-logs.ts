import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mealLogsApi, type MealLogListParams } from "../api/meal-logs.api";
import { toast } from "sonner";

export function useMealLogs(params?: MealLogListParams) {
  return useQuery({
    queryKey: ["meal-logs", params],
    queryFn: () => mealLogsApi.getMealLogs(params),
    staleTime: 30 * 1000,
  });
}

export function useCreateMealLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mealLogsApi.createMealLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-logs"] });
      queryClient.invalidateQueries({ queryKey: ["nutrition"] });
      toast.success("Meal logged!");
    },
  });
}

export function useDeleteMealLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mealLogsApi.deleteMealLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-logs"] });
      queryClient.invalidateQueries({ queryKey: ["nutrition"] });
      toast.success("Meal log removed");
    },
  });
}
