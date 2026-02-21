import { z } from "zod";

// Standard API response envelope
export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Cursor-based pagination
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

// Zod schemas for validation reuse
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
