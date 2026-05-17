import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth-store";
import { useAuth } from "./use-auth";

const { pushMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastSuccessMock: vi.fn(),
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

vi.mock("../api/auth.api", () => ({
  authApi: {
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

const mockUser = {
  id: "user-1",
  email: "user@example.com",
  displayName: "Test User",
  unitPreference: "metric",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    pushMock.mockClear();
    toastSuccessMock.mockClear();
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,
    });
  });

  it("stores backend token response after login", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      user: mockUser,
      tokens: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresIn: 3600,
        expiresAt: 1770000000,
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    act(() => {
      result.current.login({ email: mockUser.email, password: "Password1" });
    });

    await waitFor(() => {
      expect(localStorage.getItem("accessToken")).toBe("access-token");
    });
    expect(localStorage.getItem("refreshToken")).toBe("refresh-token");
    expect(useAuthStore.getState().user?.id).toBe("user-1");
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
    expect(toastSuccessMock).toHaveBeenCalledWith("Welcome back!");
  });
});
