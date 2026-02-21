// Re-export types from shared package
export type * from "@snacktrack/shared-types";

// Additional frontend-specific types
export interface User {
  id: string;
  email: string;
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: string;
  healthGoal?: string;
  unitPreference: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface Recipe {
  id: string;
  spoonacularId?: number;
  title: string;
  imageUrl?: string;
  cloudinaryUrl?: string;
  readyInMinutes?: number;
  servings?: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  sodiumMg?: number;
  fiberG?: number;
  sugarG?: number;
  ingredients?: unknown;
  allergens: string[];
  dietLabels: string[];
  cuisineTypes: string[];
  instructions?: unknown;
}

export interface MealPlan {
  id: string;
  userId: string;
  name?: string;
  startDate: string;
  endDate: string;
  status: string;
  calorieTarget?: number;
  items: MealPlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanItem {
  id: string;
  planId: string;
  recipeId: string;
  recipe?: Recipe;
  dayNumber: number;
  mealType: string;
  servings: number;
  isSwapped: boolean;
  originalRecipeId?: string;
  createdAt: string;
}

export interface MealLog {
  id: string;
  userId: string;
  recipeId?: string;
  recipe?: Recipe;
  mealType: string;
  foodName: string;
  servings: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  loggedAt: string;
  source: string;
}

export interface DietaryPreference {
  id: string;
  userId: string;
  dietType?: string;
  cuisinePreferences: string[];
  maxPrepTimeMin?: number;
  cookingSkill?: string;
  calorieTarget?: number;
  proteinTargetG?: number;
  carbTargetG?: number;
  fatTargetG?: number;
  updatedAt: string;
}

export interface UserAllergen {
  id: string;
  userId: string;
  allergenType: string;
  severity: string;
  isCustom: boolean;
  createdAt: string;
}

export interface RecipeFilters {
  search?: string;
  diet?: string;
  cuisine?: string[];
  maxReadyTime?: number;
  minCalories?: number;
  maxCalories?: number;
  allergens?: string[];
  page?: number;
  limit?: number;
}

export interface NutritionSummary {
  date: string;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  calorieTarget?: number;
  proteinTarget?: number;
  carbTarget?: number;
  fatTarget?: number;
}
