import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type NavigateToPath = (path: string) => void;

interface RefreshResponse {
  data: {
    tokens: { accessToken: string; refreshToken: string };
  } | null;
}

export class ApiClient {
  private client: AxiosInstance;
  private navigateToPath: NavigateToPath;
  /** Deduplicates concurrent refresh attempts behind a single promise. */
  private refreshPromise: Promise<string | null> | null = null;

  constructor(
    navigateToPath: NavigateToPath = (path) => {
      if (typeof window !== "undefined") {
        window.location.replace(path);
      }
    }
  ) {
    this.navigateToPath = navigateToPath;
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
      timeout: 15000,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("accessToken");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: refresh-token rotation on 401, then error toasts
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<{ error?: { message?: string } }>) => {
        if (error.code === "ERR_CANCELED") {
          return Promise.reject(error);
        }

        const message =
          error.response?.data?.error?.message ||
          error.message ||
          "Something went wrong";

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && typeof window !== "undefined") {
          const original = error.config as
            | (InternalAxiosRequestConfig & { _retry?: boolean })
            | undefined;
          const refreshToken = localStorage.getItem("refreshToken");
          const isAuthCall = original?.url?.includes("/auth/");

          // One transparent refresh-and-retry per request
          if (original && !original._retry && refreshToken && !isAuthCall) {
            original._retry = true;
            const newToken = await this.refreshAccessToken(refreshToken);
            if (newToken) {
              original.headers.Authorization = `Bearer ${newToken}`;
              return this.client(original);
            }
          }

          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          if (window.location.pathname !== "/login") {
            this.navigateToPath("/login");
          }
        }

        // Show error toast
        if (typeof window !== "undefined") {
          toast.error(message);
        }

        return Promise.reject(error);
      }
    );
  }

  private refreshAccessToken(refreshToken: string): Promise<string | null> {
    this.refreshPromise ??= axios
      .post<RefreshResponse>(
        `${API_URL}/auth/refresh`,
        { refreshToken },
        { timeout: 10000 }
      )
      .then((res) => {
        const tokens = res.data.data?.tokens;
        if (!tokens) return null;
        localStorage.setItem("accessToken", tokens.accessToken);
        localStorage.setItem("refreshToken", tokens.refreshToken);
        return tokens.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  get<T>(url: string, config?: object) {
    return this.client.get<T>(url, config);
  }

  post<T>(url: string, data?: unknown, config?: object) {
    return this.client.post<T>(url, data, config);
  }

  put<T>(url: string, data?: unknown, config?: object) {
    return this.client.put<T>(url, data, config);
  }

  patch<T>(url: string, data?: unknown, config?: object) {
    return this.client.patch<T>(url, data, config);
  }

  delete<T>(url: string, config?: object) {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();
