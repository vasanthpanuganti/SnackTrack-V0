import { z } from "zod";

// --- Interfaces ---

export interface Recipe {
  id: string;
  spoonacularId: number | null;
  title: string;
  imageUrl: string | null;
  cloudinaryUrl: string | null;
  readyInMinutes: number | null;
  servings: number | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  sodiumMg: number | null;
  fiberG: number | null;
  sugarG: number | null;
  ingredients: Ingredient[] | null;
  allergens: string[];
  dietLabels: string[];
  cuisineTypes: string[];
  instructions: InstructionStep[] | null;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  original: string;
}

export interface InstructionStep {
  number: number;
  step: string;
}

export interface MealPlan {
  id: string;
  userId: string;
  name: string | null;
  startDate: string;
  endDate: string;
  status: "active" | "archived" | "draft";
  calorieTarget: number | null;
  items: MealPlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanItem {
  id: string;
  dayNumber: number;
  mealType: MealType;
  recipe: Recipe;
  servings: number;
  isSwapped: boolean;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export interface FoodSearchResult {
  id: string;
  name: string;
  source: "spoonacular" | "usda";
  sourceId: number;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  imageUrl: string | null;
}

export interface RecipeRecommendation {
  recipeId: string;
  score: number;
  contentScore: number | null;
  collabScore: number | null;
  rank: number;
}

// --- Zod schemas ---

export const generateMealPlanSchema = z.object({
  type: z.enum(["daily", "weekly"]).default("daily"),
  date: z.string().date().optional(),
});

export const swapMealSchema = z.object({
  mealSlot: z.object({
    dayNumber: z.number().int().min(1).max(7),
    mealType: z.enum(MEAL_TYPES),
  }),
  rejectedRecipeId: z.string().uuid(),
});

export const foodSearchSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
