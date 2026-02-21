import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/database.js";
import { supabaseAdmin } from "../../src/config/supabase.js";
import { vi } from "vitest";

export function createTestApp() {
  return createApp();
}

const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440099";

export function mockAuth(userId: string = TEST_USER_ID) {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: {
      user: {
        id: userId,
        email: "integration@snacktrack.dev",
        role: "authenticated",
      } as never,
    },
    error: null,
  });
}

export async function seedTestUser(userId: string = TEST_USER_ID) {
  return prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: "integration@snacktrack.dev",
      displayName: "Integration Test User",
    },
    update: {},
  });
}

export async function cleanup() {
  // Clean up in reverse dependency order
  const tablesToClean = [
    "recommendation_cache",
    "user_interactions",
    "meal_plan_items",
    "meal_plans",
    "meal_logs",
    "user_taste_profiles",
    "user_allergens",
    "dietary_preferences",
    "recipes",
    "users",
  ];

  for (const table of tablesToClean) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
    } catch {
      // Table might not exist or have constraints
    }
  }
}

export { TEST_USER_ID };
