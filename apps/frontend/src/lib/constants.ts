import type { MealType } from "@/types";

export const MEAL_TYPE_META: Record<
  MealType,
  { label: string; emoji: string; order: number }
> = {
  breakfast: { label: "Breakfast", emoji: "🌅", order: 0 },
  lunch: { label: "Lunch", emoji: "☀️", order: 1 },
  dinner: { label: "Dinner", emoji: "🌙", order: 2 },
  snack: { label: "Snack", emoji: "🍎", order: 3 },
};

/** Sensible meal-type default for "log now" flows, based on local time. */
export function defaultMealType(now: Date = new Date()): MealType {
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < 10.5) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export const DIET_OPTIONS = [
  { value: "none", label: "No restrictions" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "whole30", label: "Whole30" },
  { value: "low_carb", label: "Low carb" },
  { value: "low_fat", label: "Low fat" },
] as const;

/** Quick filter chips on the recipe browser — values match Spoonacular diet labels. */
export const RECIPE_DIET_FILTERS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten free", label: "Gluten free" },
  { value: "ketogenic", label: "Keto" },
  { value: "pescatarian", label: "Pescatarian" },
] as const;

export const CUISINE_OPTIONS = [
  "Italian",
  "Mexican",
  "Mediterranean",
  "Indian",
  "Thai",
  "Japanese",
  "Chinese",
  "American",
  "Middle Eastern",
  "French",
  "Korean",
  "Greek",
] as const;

export const FDA_ALLERGENS = [
  { value: "milk", label: "Milk" },
  { value: "eggs", label: "Eggs" },
  { value: "fish", label: "Fish" },
  { value: "shellfish", label: "Shellfish" },
  { value: "tree_nuts", label: "Tree nuts" },
  { value: "peanuts", label: "Peanuts" },
  { value: "wheat", label: "Wheat" },
  { value: "soybeans", label: "Soybeans" },
  { value: "sesame", label: "Sesame" },
] as const;

export const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Sedentary", hint: "Little or no exercise" },
  { value: "light", label: "Lightly active", hint: "1–3 workouts / week" },
  { value: "moderate", label: "Moderately active", hint: "3–5 workouts / week" },
  { value: "active", label: "Active", hint: "6–7 workouts / week" },
  { value: "very_active", label: "Very active", hint: "Physical job or 2× training" },
] as const;

export const GOAL_OPTIONS = [
  { value: "weight_loss", label: "Weight loss" },
  { value: "muscle_gain", label: "Muscle gain" },
  { value: "heart_health", label: "Heart health" },
  { value: "diabetic", label: "Diabetes friendly" },
  { value: "sports", label: "Sports performance" },
  { value: "wellness", label: "Overall wellness" },
] as const;

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

/**
 * Curated Unsplash food photography (stable photo IDs, free license).
 * Served via next/image with on-the-fly optimization.
 */
const unsplash = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const IMAGES = {
  heroBowl: unsplash("photo-1512621776951-a57141f2eefd"),
  freshTable: unsplash("photo-1498837167922-ddd27525d352"),
  avocadoToast: unsplash("photo-1482049016688-2d3e1b311543"),
  berryBreakfast: unsplash("photo-1490645935967-10de6ba17061"),
  salmonPlate: unsplash("photo-1467003909585-2f8a72700288"),
  pastaDish: unsplash("photo-1473093295043-cdd812d0e601"),
  greenBowl: unsplash("photo-1546069901-ba9599a7e63c"),
  platesSpread: unsplash("photo-1504674900247-0877df9cc836"),
  saladPlate: unsplash("photo-1540189549336-e6e99c3679fe"),
} as const;
