import { apiClient } from "./client";
import type { User } from "@/types";

interface SignupInput {
  email: string;
  password: string;
  displayName?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  status: string;
  data: {
    user: User;
    session: {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };
  };
  error: null;
}

export const authApi = {
  signup: async (data: SignupInput) => {
    const response = await apiClient.post<AuthResponse>("/auth/signup", data);
    return response.data.data;
  },

  login: async (data: LoginInput) => {
    const response = await apiClient.post<AuthResponse>("/auth/login", data);
    return response.data.data;
  },

  logout: async () => {
    const response = await apiClient.post("/auth/logout");
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post<AuthResponse>("/auth/refresh", {
      refreshToken,
    });
    return response.data.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get<{ status: string; data: User }>(
      "/users/me"
    );
    return response.data.data;
  },
};
