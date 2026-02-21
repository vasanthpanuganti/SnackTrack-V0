import { z } from "zod";
import type { MealType } from "./recipe.js";

// --- Interfaces ---

export interface MealLog {
  id: string;
  userId: string;
  recipeId: string | null;
  mealType: MealType;
  foodName: string;
  servings: number;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  loggedAt: string;
  source: MealLogSource;
  synced: boolean;
}

export type MealLogSource = "search" | "plan_adopt" | "recent" | "manual" | "barcode";

export interface NutritionSummary {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sodiumMg?: number;
  fiberG?: number;
  sugarG?: number;
}

export interface DailyNutritionSummary {
  date: string;
  consumed: NutritionSummary;
  targets: NutritionSummary | null;
  mealCount: number;
  percentages: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
}

export interface WeeklyNutritionSummary {
  weekStart: string;
  weekEnd: string;
  dailyBreakdown: DailyNutritionSummary[];
  weeklyTotals: NutritionSummary;
  weeklyAverages: NutritionSummary;
}

// --- Zod schemas ---

export const createMealLogSchema = z.object({
  recipeId: z.string().uuid().nullable().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  foodName: z.string().min(1).max(255),
  servings: z.number().min(0.1).max(99).default(1),
  calories: z.number().min(0).nullable().optional(),
  proteinG: z.number().min(0).nullable().optional(),
  carbsG: z.number().min(0).nullable().optional(),
  fatG: z.number().min(0).nullable().optional(),
  loggedAt: z.string().datetime().optional(),
  source: z.enum(["search", "plan_adopt", "recent", "manual", "barcode"]).default("manual"),
});

export const dailyNutritionQuerySchema = z.object({
  date: z.string().date(),
});

export const weeklyNutritionQuerySchema = z.object({
  week: z.string().date(),
});

export const mealLogQuerySchema = z.object({
  date: z.string().date().optional(),
  range: z.enum(["day", "week", "month"]).default("day"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
