import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "./client";

const { toastErrorMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

describe("ApiClient interceptors", () => {
  beforeEach(() => {
    localStorage.clear();
    toastErrorMock.mockClear();
  });

  it("adds Authorization header when access token exists", async () => {
    localStorage.setItem("accessToken", "test-token");
    const client = new ApiClient() as unknown as {
      client: {
        interceptors: {
          request: {
            handlers: Array<{
              fulfilled: (config: { headers: Record<string, string> }) => {
                headers: Record<string, string>;
              };
            }>;
          };
        };
      };
    };

    const requestInterceptor =
      client.client.interceptors.request.handlers[0].fulfilled;
    const config = await requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe("Bearer test-token");
  });

  it("clears tokens and redirects on unauthorized responses", async () => {
    localStorage.setItem("accessToken", "test-token");
    localStorage.setItem("refreshToken", "refresh-token");
    window.history.pushState({}, "", "/dashboard");
    const navigateMock = vi.fn();

    const client = new ApiClient(navigateMock) as unknown as {
      client: {
        interceptors: {
          response: {
            handlers: Array<{
              rejected: (error: {
                response?: {
                  status?: number;
                  data?: { error?: { message?: string } };
                };
                message?: string;
              }) => Promise<never>;
            }>;
          };
        };
      };
    };

    const responseErrorInterceptor =
      client.client.interceptors.response.handlers[0].rejected;

    await expect(
      responseErrorInterceptor({
        response: {
          status: 401,
          data: { error: { message: "Unauthorized" } },
        },
        message: "Unauthorized",
      })
    ).rejects.toBeTruthy();

    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(navigateMock).toHaveBeenCalledWith("/login");
    expect(toastErrorMock).toHaveBeenCalledWith("Unauthorized");
  });

  it("skips redirect when already on login page", async () => {
    window.history.pushState({}, "", "/login");
    const navigateMock = vi.fn();
    const client = new ApiClient(navigateMock) as unknown as {
      client: {
        interceptors: {
          response: {
            handlers: Array<{
              rejected: (error: {
                response?: {
                  status?: number;
                  data?: { error?: { message?: string } };
                };
                message?: string;
              }) => Promise<never>;
            }>;
          };
        };
      };
    };

    const responseErrorInterceptor =
      client.client.interceptors.response.handlers[0].rejected;

    await expect(
      responseErrorInterceptor({
        response: {
          status: 401,
          data: { error: { message: "Unauthorized" } },
        },
      })
    ).rejects.toBeTruthy();

    expect(navigateMock).not.toHaveBeenCalled();
  });
});
