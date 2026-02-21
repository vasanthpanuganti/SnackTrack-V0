import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../src/config/supabase.js", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
      admin: { deleteUser: vi.fn() },
    },
  },
  createUserClient: vi.fn(),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createTestApp, mockAuth, seedTestUser, cleanup, TEST_USER_ID } from "./helpers.js";
import { prisma } from "../../src/config/database.js";

const app = createTestApp();

describe("Nutrition Integration Tests", () => {
  beforeAll(async () => {
    await cleanup();
    await seedTestUser();
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it("logs a meal and retrieves daily nutrition", async () => {
    // Create meal log
    const logRes = await request(app)
      .post("/api/v1/meal-logs")
      .set("Authorization", "Bearer valid-token")
      .send({
        mealType: "lunch",
        foodName: "Integration Test Salad",
        servings: 1,
        calories: 400,
        proteinG: 30,
        carbsG: 40,
        fatG: 15,
      });

    expect(logRes.status).toBe(201);
    expect(logRes.body.data.foodName).toBe("Integration Test Salad");
    const logId = logRes.body.data.id;

    // Get daily nutrition for today
    const today = new Date().toISOString().split("T")[0];
    const dailyRes = await request(app)
      .get(`/api/v1/nutrition/daily?date=${today}`)
      .set("Authorization", "Bearer valid-token");

    expect(dailyRes.status).toBe(200);
    expect(dailyRes.body.data.consumed.calories).toBeGreaterThanOrEqual(400);
    expect(dailyRes.body.data.mealCount).toBeGreaterThanOrEqual(1);

    // List meal logs
    const listRes = await request(app)
      .get(`/api/v1/meal-logs?date=${today}`)
      .set("Authorization", "Bearer valid-token");

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.items.length).toBeGreaterThanOrEqual(1);

    // Delete the log
    const deleteRes = await request(app)
      .delete(`/api/v1/meal-logs/${logId}`)
      .set("Authorization", "Bearer valid-token");

    expect(deleteRes.status).toBe(200);
  });

  it("returns weekly nutrition summary", async () => {
    const today = new Date().toISOString().split("T")[0];
    const weeklyRes = await request(app)
      .get(`/api/v1/nutrition/weekly?week=${today}`)
      .set("Authorization", "Bearer valid-token");

    expect(weeklyRes.status).toBe(200);
    expect(weeklyRes.body.data.dailyBreakdown).toHaveLength(7);
    expect(weeklyRes.body.data.weeklyTotals).toBeDefined();
    expect(weeklyRes.body.data.weeklyAverages).toBeDefined();
  });
});
