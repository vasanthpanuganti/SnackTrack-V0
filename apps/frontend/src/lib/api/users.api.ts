import { apiClient } from "./client";
import type { User, DietaryPreference, UserAllergen } from "@/types";

interface UserResponse {
  status: string;
  data: User;
  error: null;
}

interface PreferenceResponse {
  status: string;
  data: DietaryPreference;
  error: null;
}

interface AllergensResponse {
  status: string;
  data: UserAllergen[];
  error: null;
}

export const usersApi = {
  getProfile: async () => {
    const response = await apiClient.get<UserResponse>("/users/me");
    return response.data.data;
  },

  updateProfile: async (data: Partial<User>) => {
    const response = await apiClient.put<UserResponse>("/users/me", data);
    return response.data.data;
  },

  getPreferences: async () => {
    const response = await apiClient.get<PreferenceResponse>(
      "/users/me/preferences"
    );
    return response.data.data;
  },

  updatePreferences: async (data: Partial<DietaryPreference>) => {
    const response = await apiClient.put<PreferenceResponse>(
      "/users/me/preferences",
      data
    );
    return response.data.data;
  },

  getAllergens: async () => {
    const response = await apiClient.get<AllergensResponse>(
      "/users/me/allergens"
    );
    return response.data.data;
  },

  addAllergen: async (data: { allergenType: string; severity: string }) => {
    const response = await apiClient.post<{ status: string; data: UserAllergen }>(
      "/users/me/allergens",
      data
    );
    return response.data.data;
  },

  removeAllergen: async (id: string) => {
    await apiClient.delete(`/users/me/allergens/${id}`);
  },
};
