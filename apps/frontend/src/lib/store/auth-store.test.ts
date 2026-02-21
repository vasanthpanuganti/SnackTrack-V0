import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth-store";

const mockUser = {
  id: "user-1",
  email: "user@example.com",
  displayName: "Test User",
  unitPreference: "metric",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("auth-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,
    });
  });

  it("stores auth state and tokens when setAuth is called", () => {
    useAuthStore.getState().setAuth(mockUser, "access-token", "refresh-token");

    const state = useAuthStore.getState();
    expect(state.user?.id).toBe("user-1");
    expect(state.accessToken).toBe("access-token");
    expect(state.refreshToken).toBe("refresh-token");
    expect(localStorage.getItem("accessToken")).toBe("access-token");
    expect(localStorage.getItem("refreshToken")).toBe("refresh-token");
  });

  it("clears auth state and tokens when clearAuth is called", () => {
    useAuthStore.getState().setAuth(mockUser, "access-token", "refresh-token");
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });

  it("merges user profile updates without removing existing fields", () => {
    useAuthStore.getState().setAuth(mockUser, "access-token", "refresh-token");
    useAuthStore.getState().updateUser({ displayName: "Updated User" });

    const state = useAuthStore.getState();
    expect(state.user?.displayName).toBe("Updated User");
    expect(state.user?.email).toBe("user@example.com");
  });
});
