import React, { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./use-auth";

const {
  clearAuthMock,
  loginMock,
  pushMock,
  setAuthMock,
  signupMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  clearAuthMock: vi.fn(),
  loginMock: vi.fn(),
  pushMock: vi.fn(),
  setAuthMock: vi.fn(),
  signupMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("../api/auth.api", () => ({
  authApi: {
    login: loginMock,
    signup: signupMock,
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

vi.mock("../store/auth-store", () => ({
  useAuthStore: () => ({
    user: null,
    setAuth: setAuthMock,
    clearAuth: clearAuthMock,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores backend tokens and navigates after login", async () => {
    const user = { id: "user-1", email: "test@example.com" };
    loginMock.mockResolvedValue({
      user,
      tokens: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresIn: 3600,
        expiresAt: 123456,
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    result.current.login({ email: "test@example.com", password: "password123" });

    await waitFor(() =>
      expect(setAuthMock).toHaveBeenCalledWith(
        user,
        "access-token",
        "refresh-token"
      )
    );
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
    expect(toastSuccessMock).toHaveBeenCalledWith("Welcome back!");
  });

  it("stores backend tokens and navigates after signup", async () => {
    const user = { id: "user-2", email: "new@example.com" };
    signupMock.mockResolvedValue({
      user,
      tokens: {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresIn: 3600,
        expiresAt: 123456,
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    result.current.signup({
      email: "new@example.com",
      password: "password123",
      displayName: "New User",
    });

    await waitFor(() =>
      expect(setAuthMock).toHaveBeenCalledWith(
        user,
        "new-access-token",
        "new-refresh-token"
      )
    );
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
    expect(toastSuccessMock).toHaveBeenCalledWith("Account created successfully!");
  });
});
