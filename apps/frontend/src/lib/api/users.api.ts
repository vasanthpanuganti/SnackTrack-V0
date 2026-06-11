import { apiClient } from "./client";
import type {
  ApiResponse,
  User,
  UserProfile,
  DietaryPreference,
  UserAllergen,
  AllergenSeverity,
} from "@/types";

export interface UpdateProfileInput {
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: string;
  healthGoal?: string;
  unitPreference?: string;
}

export interface UpdatePreferencesInput {
  dietType?: string | null;
  cuisinePreferences?: string[];
  maxPrepTimeMin?: number | null;
  cookingSkill?: string | null;
  calorieTarget?: number | null;
  proteinTargetG?: number | null;
  carbTargetG?: number | null;
  fatTargetG?: number | null;
}

export interface AllergenInput {
  allergenType: string;
  severity?: AllergenSeverity;
  isCustom?: boolean;
}

export const usersApi = {
  /** Full profile including preferences and allergens. */
  getProfile: async () => {
    const response = await apiClient.get<ApiResponse<UserProfile>>("/users/me");
    return response.data.data!;
  },

  updateProfile: async (data: UpdateProfileInput) => {
    const response = await apiClient.patch<ApiResponse<User>>("/users/me", data);
    return response.data.data!;
  },

  updatePreferences: async (data: UpdatePreferencesInput) => {
    const response = await apiClient.put<ApiResponse<DietaryPreference>>(
      "/users/me/preferences",
      data
    );
    return response.data.data!;
  },

  /** Replaces the full allergen list (PUT semantics on the backend). */
  replaceAllergens: async (allergens: AllergenInput[]) => {
    const response = await apiClient.put<ApiResponse<UserAllergen[]>>(
      "/users/me/allergens",
      { allergens }
    );
    return response.data.data!;
  },

  deleteAccount: async () => {
    await apiClient.delete("/users/me");
  },
};
