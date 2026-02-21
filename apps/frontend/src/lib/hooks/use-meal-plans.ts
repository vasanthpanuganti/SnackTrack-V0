import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mealPlansApi } from "../api/meal-plans.api";
import { toast } from "sonner";
import type { MealPlan } from "@/types";

export function useMealPlans() {
  return useQuery({
    queryKey: ["meal-plans"],
    queryFn: mealPlansApi.getMealPlans,
  });
}

export function useMealPlan(id: string) {
  return useQuery({
    queryKey: ["meal-plans", id],
    queryFn: () => mealPlansApi.getMealPlan(id),
    enabled: !!id,
  });
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mealPlansApi.createMealPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      toast.success("Meal plan created successfully!");
    },
  });
}

export function useUpdateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MealPlan> }) =>
      mealPlansApi.updateMealPlan(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      queryClient.invalidateQueries({ queryKey: ["meal-plans", variables.id] });
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
    mutationFn: ({ planId, data }: { planId: string; data: { itemId: string; newRecipeId: string } }) =>
      mealPlansApi.swapMeal(planId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans", variables.planId] });
      toast.success("Meal swapped successfully!");
    },
  });
}
