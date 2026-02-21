import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mealLogsApi } from "../api/meal-logs.api";
import { toast } from "sonner";
import type { MealLog } from "@/types";

export function useMealLogs(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ["meal-logs", params],
    queryFn: () => mealLogsApi.getMealLogs(params),
  });
}

export function useMealLog(id: string) {
  return useQuery({
    queryKey: ["meal-logs", id],
    queryFn: () => mealLogsApi.getMealLog(id),
    enabled: !!id,
  });
}

export function useCreateMealLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mealLogsApi.createMealLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-logs"] });
      toast.success("Meal logged successfully!");
    },
  });
}

export function useUpdateMealLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MealLog> }) =>
      mealLogsApi.updateMealLog(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meal-logs"] });
      queryClient.invalidateQueries({ queryKey: ["meal-logs", variables.id] });
      toast.success("Meal log updated!");
    },
  });
}

export function useDeleteMealLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mealLogsApi.deleteMealLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-logs"] });
      toast.success("Meal log deleted");
    },
  });
}
