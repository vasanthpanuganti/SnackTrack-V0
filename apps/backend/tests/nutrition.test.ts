import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../src/config/database.js", () => ({
  isDatabaseHealthy: vi.fn().mockResolvedValue(true),
  prisma: {
    mealLog: {
      findMany: vi.fn(),
    },
    dietaryPreference: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../src/config/redis.js", () => ({
  isRedisHealthy: vi.fn().mockResolvedValue(true),
  redis: { on: vi.fn() },
}));

vi.mock("../src/config/supabase.js", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
      admin: { deleteUser: vi.fn() },
    },
  },
  createUserClient: vi.fn(),
}));

vi.mock("../src/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createApp } from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { supabaseAdmin } from "../src/config/supabase.js";

const app = createApp();
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

function mockAuth() {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: {
      user: { id: USER_ID, email: "test@snacktrack.dev", role: "authenticated" } as never,
    },
    error: null,
  });
}

const mockPreferences = {
  id: "pref-0001",
  userId: USER_ID,
  dietType: "mediterranean",
  cuisinePreferences: [],
  maxPrepTimeMin: 45,
  cookingSkill: "intermediate",
  calorieTarget: 2000,
  proteinTargetG: 100,
  carbTargetG: 250,
  fatTargetG: 67,
  updatedAt: new Date(),
};

const mockLogs = [
  {
    id: "log1",
    userId: USER_ID,
    recipeId: null,
    mealType: "breakfast",
    foodName: "Oatmeal",
    servings: 1,
    calories: 300,
    proteinG: 10,
    carbsG: 50,
    fatG: 8,
    loggedAt: new Date("2025-06-15T08:00:00Z"),
    source: "manual",
    synced: true,
  },
  {
    id: "log2",
    userId: USER_ID,
    recipeId: null,
    mealType: "lunch",
    foodName: "Chicken Salad",
    servings: 1,
    calories: 450,
    proteinG: 40,
    carbsG: 20,
    fatG: 22,
    loggedAt: new Date("2025-06-15T12:00:00Z"),
    source: "manual",
    synced: true,
  },
];

describe("Nutrition endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  describe("GET /api/v1/nutrition/daily", () => {
    it("returns 200 with daily summary including percentages", async () => {
      vi.mocked(prisma.mealLog.findMany).mockResolvedValue(mockLogs as never);
      vi.mocked(prisma.dietaryPreference.findUnique).mockResolvedValue(mockPreferences as never);

      const res = await request(app)
        .get("/api/v1/nutrition/daily?date=2025-06-15")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");

      const data = res.body.data;
      expect(data.date).toBe("2025-06-15");
      expect(data.consumed.calories).toBe(750);
      expect(data.consumed.proteinG).toBe(50);
      expect(data.consumed.carbsG).toBe(70);
      expect(data.consumed.fatG).toBe(30);
      expect(data.mealCount).toBe(2);
      expect(data.targets).not.toBeNull();
      expect(data.percentages.calories).toBe(38); // 750/2000 * 100
      expect(data.percentages.protein).toBe(50); // 50/100 * 100
    });

    it("returns null targets when no preferences set", async () => {
      vi.mocked(prisma.mealLog.findMany).mockResolvedValue(mockLogs as never);
      vi.mocked(prisma.dietaryPreference.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .get("/api/v1/nutrition/daily?date=2025-06-15")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.data.targets).toBeNull();
      expect(res.body.data.percentages.calories).toBeNull();
    });

    it("returns zeros when no meals logged", async () => {
      vi.mocked(prisma.mealLog.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.dietaryPreference.findUnique).mockResolvedValue(mockPreferences as never);

      const res = await request(app)
        .get("/api/v1/nutrition/daily?date=2025-06-15")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.data.consumed.calories).toBe(0);
      expect(res.body.data.mealCount).toBe(0);
      expect(res.body.data.percentages.calories).toBe(0);
    });

    it("returns 422 for missing date parameter", async () => {
      const res = await request(app)
        .get("/api/v1/nutrition/daily")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/v1/nutrition/weekly", () => {
    it("returns 200 with weekly summary", async () => {
      // Mock: return logs only for the queried day, empty for rest
      vi.mocked(prisma.mealLog.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.dietaryPreference.findUnique).mockResolvedValue(mockPreferences as never);

      const res = await request(app)
        .get("/api/v1/nutrition/weekly?week=2025-06-15")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.weekStart).toBe("2025-06-15");
      expect(res.body.data.dailyBreakdown).toHaveLength(7);
      expect(res.body.data.weeklyTotals).toBeDefined();
      expect(res.body.data.weeklyAverages).toBeDefined();
    });

    it("returns 422 for missing week parameter", async () => {
      const res = await request(app)
        .get("/api/v1/nutrition/weekly")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
