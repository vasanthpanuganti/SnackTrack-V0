import { z } from "zod";

// Health goal options
export const HEALTH_GOALS = [
  "weight_loss",
  "muscle_gain",
  "heart_health",
  "diabetic",
  "sports",
  "wellness",
] as const;

export type HealthGoal = (typeof HEALTH_GOALS)[number];

// Activity levels
export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

// Gender options
export const GENDERS = ["male", "female", "non_binary", "prefer_not_to_say"] as const;

export type Gender = (typeof GENDERS)[number];

// Diet types
export const DIET_TYPES = [
  "none",
  "vegetarian",
  "vegan",
  "keto",
  "paleo",
  "mediterranean",
  "pescatarian",
  "whole30",
  "low_carb",
  "low_fat",
] as const;

export type DietType = (typeof DIET_TYPES)[number];

// Cooking skill levels
export const COOKING_SKILLS = ["beginner", "intermediate", "advanced"] as const;

export type CookingSkill = (typeof COOKING_SKILLS)[number];

// FDA Top 9 allergens
export const FDA_TOP_9_ALLERGENS = [
  "milk",
  "eggs",
  "fish",
  "shellfish",
  "tree_nuts",
  "peanuts",
  "wheat",
  "soybeans",
  "sesame",
] as const;

export type FdaAllergen = (typeof FDA_TOP_9_ALLERGENS)[number];

// Allergen severity
export const ALLERGEN_SEVERITIES = ["severe", "moderate", "intolerance"] as const;

export type AllergenSeverity = (typeof ALLERGEN_SEVERITIES)[number];

// Unit preference
export const UNIT_PREFERENCES = ["metric", "imperial"] as const;

export type UnitPreference = (typeof UNIT_PREFERENCES)[number];

// --- Interfaces ---

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  healthGoal: HealthGoal | null;
  unitPreference: UnitPreference;
  createdAt: string;
  updatedAt: string;
}

export interface UserAllergen {
  id: string;
  allergenType: string;
  severity: AllergenSeverity;
  isCustom: boolean;
  createdAt: string;
}

export interface DietaryPreference {
  id: string;
  dietType: DietType | null;
  cuisinePreferences: string[];
  maxPrepTimeMin: number | null;
  cookingSkill: CookingSkill | null;
  calorieTarget: number | null;
  proteinTargetG: number | null;
  carbTargetG: number | null;
  fatTargetG: number | null;
  updatedAt: string;
}

export interface UserProfile extends User {
  allergens: UserAllergen[];
  preferences: DietaryPreference | null;
}

// --- Zod schemas for validation ---

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().date().optional(),
  gender: z.enum(GENDERS).optional(),
  heightCm: z.number().min(50).max(300).optional(),
  weightKg: z.number().min(10).max(500).optional(),
  activityLevel: z.enum(ACTIVITY_LEVELS).optional(),
  healthGoal: z.enum(HEALTH_GOALS).optional(),
  unitPreference: z.enum(UNIT_PREFERENCES).optional(),
});

export const allergenItemSchema = z.object({
  allergenType: z.string().min(1).max(100),
  severity: z.enum(ALLERGEN_SEVERITIES).default("severe"),
  isCustom: z.boolean().default(false),
});

export const updateAllergensSchema = z.object({
  allergens: z.array(allergenItemSchema).max(50),
});

export const updatePreferencesSchema = z.object({
  dietType: z.enum(DIET_TYPES).nullable().optional(),
  cuisinePreferences: z.array(z.string().max(50)).max(20).optional(),
  maxPrepTimeMin: z.number().int().min(5).max(480).nullable().optional(),
  cookingSkill: z.enum(COOKING_SKILLS).nullable().optional(),
  calorieTarget: z.number().int().min(500).max(10000).nullable().optional(),
  proteinTargetG: z.number().min(0).max(1000).nullable().optional(),
  carbTargetG: z.number().min(0).max(2000).nullable().optional(),
  fatTargetG: z.number().min(0).max(1000).nullable().optional(),
});
