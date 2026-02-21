import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock dependencies before imports
vi.mock("../src/config/database.js", () => ({
  isDatabaseHealthy: vi.fn().mockResolvedValue(true),
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userAllergen: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    dietaryPreference: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
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

const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const TEST_USER_EMAIL = "test@snacktrack.dev";

// Helper to mock authenticated requests
function mockAuth() {
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: {
      user: {
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        role: "authenticated",
      } as never,
    },
    error: null,
  });
}

const mockUserRow = {
  id: TEST_USER_ID,
  email: TEST_USER_EMAIL,
  displayName: "Test User",
  dateOfBirth: new Date("1990-01-15"),
  gender: "prefer_not_to_say",
  heightCm: 170,
  weightKg: 70,
  activityLevel: "moderate",
  healthGoal: "wellness",
  unitPreference: "metric",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

const mockAllergenRow = {
  id: "a1000000-0000-0000-0000-000000000001",
  userId: TEST_USER_ID,
  allergenType: "peanuts",
  severity: "severe",
  isCustom: false,
  createdAt: new Date("2025-01-01"),
};

const mockPreferenceRow = {
  id: "p1000000-0000-0000-0000-000000000001",
  userId: TEST_USER_ID,
  dietType: "mediterranean",
  cuisinePreferences: ["italian", "indian"],
  maxPrepTimeMin: 45,
  cookingSkill: "intermediate",
  calorieTarget: 2000,
  proteinTargetG: 100,
  carbTargetG: 250,
  fatTargetG: 67,
  updatedAt: new Date("2025-01-01"),
};

describe("User endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  // ─── GET /api/v1/users/me ──────────────────────────────────────────

  describe("GET /api/v1/users/me", () => {
    it("returns 200 with full profile including allergens and preferences", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUserRow,
        allergens: [mockAllergenRow],
        preferences: mockPreferenceRow,
      } as never);

      const res = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.id).toBe(TEST_USER_ID);
      expect(res.body.data.email).toBe(TEST_USER_EMAIL);
      expect(res.body.data.displayName).toBe("Test User");
      expect(res.body.data.allergens).toHaveLength(1);
      expect(res.body.data.allergens[0].allergenType).toBe("peanuts");
      expect(res.body.data.preferences).not.toBeNull();
      expect(res.body.data.preferences.dietType).toBe("mediterranean");
      expect(res.body.error).toBeNull();
    });

    it("returns 200 with null preferences when none set", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUserRow,
        allergens: [],
        preferences: null,
      } as never);

      const res = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.data.allergens).toHaveLength(0);
      expect(res.body.data.preferences).toBeNull();
    });

    it("returns 401 without authorization header", async () => {
      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" } as never,
      });

      const res = await request(app).get("/api/v1/users/me");

      expect(res.status).toBe(401);
      expect(res.body.status).toBe("error");
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 404 when user not found in database", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("USER_NOT_FOUND");
    });
  });

  // ─── PATCH /api/v1/users/me ────────────────────────────────────────

  describe("PATCH /api/v1/users/me", () => {
    it("returns 200 with updated profile", async () => {
      const updatedRow = { ...mockUserRow, displayName: "Updated Name" };
      vi.mocked(prisma.user.update).mockResolvedValue(updatedRow as never);

      const res = await request(app)
        .patch("/api/v1/users/me")
        .set("Authorization", "Bearer valid-token")
        .send({ displayName: "Updated Name" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.displayName).toBe("Updated Name");
    });

    it("returns 422 for invalid data", async () => {
      const res = await request(app)
        .patch("/api/v1/users/me")
        .set("Authorization", "Bearer valid-token")
        .send({ heightCm: 9999 });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("accepts partial updates", async () => {
      vi.mocked(prisma.user.update).mockResolvedValue(mockUserRow as never);

      const res = await request(app)
        .patch("/api/v1/users/me")
        .set("Authorization", "Bearer valid-token")
        .send({ activityLevel: "active" });

      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_USER_ID },
          data: expect.objectContaining({ activityLevel: "active" }),
        }),
      );
    });
  });

  // ─── PUT /api/v1/users/me/allergens ────────────────────────────────

  describe("PUT /api/v1/users/me/allergens", () => {
    it("returns 200 with replaced allergens", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserRow as never);
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return (fn as (tx: typeof prisma) => Promise<unknown>)(prisma);
      });
      vi.mocked(prisma.userAllergen.deleteMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.userAllergen.createMany).mockResolvedValue({ count: 2 } as never);
      vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([
        mockAllergenRow,
        { ...mockAllergenRow, id: "a2", allergenType: "milk", severity: "moderate" },
      ] as never);

      const res = await request(app)
        .put("/api/v1/users/me/allergens")
        .set("Authorization", "Bearer valid-token")
        .send({
          allergens: [
            { allergenType: "peanuts", severity: "severe" },
            { allergenType: "milk", severity: "moderate" },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveLength(2);
    });

    it("returns 200 with empty array when clearing allergens", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserRow as never);
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return (fn as (tx: typeof prisma) => Promise<unknown>)(prisma);
      });
      vi.mocked(prisma.userAllergen.deleteMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([] as never);

      const res = await request(app)
        .put("/api/v1/users/me/allergens")
        .set("Authorization", "Bearer valid-token")
        .send({ allergens: [] });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("returns 422 when allergens array exceeds max 50", async () => {
      const tooMany = Array.from({ length: 51 }, (_, i) => ({
        allergenType: `allergen_${i}`,
      }));

      const res = await request(app)
        .put("/api/v1/users/me/allergens")
        .set("Authorization", "Bearer valid-token")
        .send({ allergens: tooMany });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ─── PUT /api/v1/users/me/preferences ──────────────────────────────

  describe("PUT /api/v1/users/me/preferences", () => {
    it("returns 200 with upserted preferences", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserRow as never);
      vi.mocked(prisma.dietaryPreference.upsert).mockResolvedValue(
        mockPreferenceRow as never,
      );

      const res = await request(app)
        .put("/api/v1/users/me/preferences")
        .set("Authorization", "Bearer valid-token")
        .send({
          dietType: "mediterranean",
          calorieTarget: 2000,
          proteinTargetG: 100,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.dietType).toBe("mediterranean");
    });

    it("returns 422 for invalid calorie target", async () => {
      const res = await request(app)
        .put("/api/v1/users/me/preferences")
        .set("Authorization", "Bearer valid-token")
        .send({ calorieTarget: 100 }); // Min is 500

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("accepts null values to clear fields", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserRow as never);
      vi.mocked(prisma.dietaryPreference.upsert).mockResolvedValue({
        ...mockPreferenceRow,
        dietType: null,
      } as never);

      const res = await request(app)
        .put("/api/v1/users/me/preferences")
        .set("Authorization", "Bearer valid-token")
        .send({ dietType: null });

      expect(res.status).toBe(200);
      expect(res.body.data.dietType).toBeNull();
    });
  });

  // ─── DELETE /api/v1/users/me ───────────────────────────────────────

  describe("DELETE /api/v1/users/me", () => {
    it("returns 200 on successful deletion", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserRow as never);
      vi.mocked(prisma.user.delete).mockResolvedValue(mockUserRow as never);
      vi.mocked(supabaseAdmin.auth.admin.deleteUser).mockResolvedValue({
        data: null,
        error: null,
      } as never);

      const res = await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.message).toBe("Account deleted successfully");
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: TEST_USER_ID },
      });
      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it("returns 404 when user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("USER_NOT_FOUND");
    });

    it("still succeeds if Supabase auth deletion fails", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserRow as never);
      vi.mocked(prisma.user.delete).mockResolvedValue(mockUserRow as never);
      vi.mocked(supabaseAdmin.auth.admin.deleteUser).mockRejectedValue(
        new Error("Supabase error"),
      );

      const res = await request(app)
        .delete("/api/v1/users/me")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
    });
  });
});
