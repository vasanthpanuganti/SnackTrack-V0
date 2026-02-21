import axios, { type AxiosInstance, type AxiosError } from "axios";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type NavigateToPath = (path: string) => void;

export class ApiClient {
  private client: AxiosInstance;
  private navigateToPath: NavigateToPath;

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
      timeout: 8000,
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

    // Response interceptor for error handling
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
        if (error.response?.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            if (window.location.pathname !== "/login") {
              this.navigateToPath("/login");
            }
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
