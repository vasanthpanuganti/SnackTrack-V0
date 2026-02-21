import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardLayout from "./layout";

const pushMock = vi.fn();

const mockAuthState = {
  user: null as unknown,
  isHydrated: false,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/components/layout/header", () => ({
  Header: () => <div data-testid="dashboard-header">Header</div>,
}));

vi.mock("@/components/layout/sidebar", () => ({
  Sidebar: () => <div data-testid="dashboard-sidebar">Sidebar</div>,
}));

vi.mock("@/lib/store/auth-store", () => ({
  useAuthStore: (selector: (state: typeof mockAuthState) => unknown) =>
    selector(mockAuthState),
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockAuthState.user = null;
    mockAuthState.isHydrated = false;
  });

  it("shows a hydration placeholder and does not redirect before state hydration", () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(document.querySelector("[aria-busy='true']")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to login when hydrated and unauthenticated", async () => {
    mockAuthState.isHydrated = true;
    mockAuthState.user = null;

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });

  it("renders the dashboard shell when user is present", () => {
    mockAuthState.isHydrated = true;
    mockAuthState.user = { id: "user-1" };

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-sidebar")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
