import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  mealPlansApi,
  type SwapMealInput,
  type UpdateMealPlanInput,
} from "../api/meal-plans.api";
import { toast } from "sonner";

export function useMealPlans() {
  return useQuery({
    queryKey: ["meal-plans", "list"],
    queryFn: () => mealPlansApi.getMealPlans(),
  });
}

export function useMealPlan(id: string) {
  return useQuery({
    queryKey: ["meal-plans", "detail", id],
    queryFn: () => mealPlansApi.getMealPlan(id),
    enabled: !!id,
  });
}

export function useGenerateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mealPlansApi.generateMealPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      toast.success("Your meal plan is ready!");
    },
  });
}

export function useUpdateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMealPlanInput }) =>
      mealPlansApi.updateMealPlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      toast.success("Meal plan updated!");
    },
  });
}

export function useDeleteMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mealPlansApi.deleteMealPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      toast.success("Meal plan deleted");
    },
  });
}

export function useSwapMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: SwapMealInput }) =>
      mealPlansApi.swapMeal(planId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      queryClient.invalidateQueries({
        queryKey: ["meal-plans", "detail", variables.planId],
      });
      toast.success("Meal swapped!");
    },
  });
}
