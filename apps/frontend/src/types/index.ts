// Re-export the API contract from the shared package — single source of truth
export type * from "@snacktrack/shared-types";

import type { User } from "@snacktrack/shared-types";

/**
 * Auth endpoints return a minimal `{ id, email }` user; the full profile is
 * hydrated from GET /users/me right after login. The store holds this union.
 */
export type AuthUser = { id: string; email: string } & Partial<
  Omit<User, "id" | "email">
>;

/** Filters for the recipe catalog (GET /recipes). */
export interface RecipeFilters {
  search?: string;
  diet?: string;
  maxReadyTime?: number;
  page?: number;
  limit?: number;
}
