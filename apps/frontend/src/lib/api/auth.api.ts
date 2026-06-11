import { apiClient } from "./client";
import type { ApiResponse, UserProfile } from "@/types";

export interface SignupInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

export interface AuthResult {
  user: { id: string; email: string };
  tokens: AuthTokens;
}

export const authApi = {
  signup: async (data: SignupInput) => {
    const response = await apiClient.post<ApiResponse<AuthResult>>(
      "/auth/signup",
      data
    );
    return response.data.data!;
  },

  login: async (data: LoginInput) => {
    const response = await apiClient.post<ApiResponse<AuthResult>>(
      "/auth/login",
      data
    );
    return response.data.data!;
  },

  logout: async () => {
    const response = await apiClient.post<ApiResponse>("/auth/logout");
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post<ApiResponse<AuthResult>>(
      "/auth/refresh",
      { refreshToken }
    );
    return response.data.data!;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get<ApiResponse<UserProfile>>("/users/me");
    return response.data.data!;
  },
};
