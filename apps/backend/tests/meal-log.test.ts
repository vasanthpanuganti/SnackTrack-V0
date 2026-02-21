import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../src/config/database.js", () => ({
  isDatabaseHealthy: vi.fn().mockResolvedValue(true),
  prisma: {
    mealLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
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

const mockLogRow = {
  id: "log-0001-0000-0000-000000000001",
  userId: USER_ID,
  recipeId: null,
  mealType: "lunch",
  foodName: "Grilled Chicken Salad",
  servings: 1,
  calories: 350,
  proteinG: 35,
  carbsG: 15,
  fatG: 18,
  loggedAt: new Date("2025-06-15T12:00:00Z"),
  source: "manual",
  synced: true,
};

describe("Meal Log endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  describe("POST /api/v1/meal-logs", () => {
    it("returns 201 with created meal log", async () => {
      vi.mocked(prisma.mealLog.create).mockResolvedValue(mockLogRow as never);

      const res = await request(app)
        .post("/api/v1/meal-logs")
        .set("Authorization", "Bearer valid-token")
        .send({
          mealType: "lunch",
          foodName: "Grilled Chicken Salad",
          calories: 350,
          proteinG: 35,
          carbsG: 15,
          fatG: 18,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data.foodName).toBe("Grilled Chicken Salad");
      expect(res.body.data.mealType).toBe("lunch");
    });

    it("returns 422 for missing required fields", async () => {
      const res = await request(app)
        .post("/api/v1/meal-logs")
        .set("Authorization", "Bearer valid-token")
        .send({ calories: 100 });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 401 without auth", async () => {
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" } as never,
      });

      const res = await request(app)
        .post("/api/v1/meal-logs")
        .send({ mealType: "lunch", foodName: "Test" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/meal-logs", () => {
    it("returns 200 with paginated meal logs", async () => {
      vi.mocked(prisma.mealLog.findMany).mockResolvedValue([mockLogRow] as never);

      const res = await request(app)
        .get("/api/v1/meal-logs?date=2025-06-15&range=day")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.hasMore).toBe(false);
    });

    it("returns empty when no logs exist", async () => {
      vi.mocked(prisma.mealLog.findMany).mockResolvedValue([] as never);

      const res = await request(app)
        .get("/api/v1/meal-logs?date=2025-06-15")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
    });
  });

  describe("DELETE /api/v1/meal-logs/:id", () => {
    it("returns 200 on successful deletion", async () => {
      vi.mocked(prisma.mealLog.findUnique).mockResolvedValue(mockLogRow as never);
      vi.mocked(prisma.mealLog.delete).mockResolvedValue(mockLogRow as never);

      const res = await request(app)
        .delete(`/api/v1/meal-logs/${mockLogRow.id}`)
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
    });

    it("returns 404 for non-existent log", async () => {
      vi.mocked(prisma.mealLog.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/v1/meal-logs/00000000-0000-0000-0000-000000000000")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("MEAL_LOG_NOT_FOUND");
    });

    it("returns 403 when user does not own the log", async () => {
      vi.mocked(prisma.mealLog.findUnique).mockResolvedValue({
        ...mockLogRow,
        userId: "other-user-id",
      } as never);

      const res = await request(app)
        .delete(`/api/v1/meal-logs/${mockLogRow.id}`)
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });
});
