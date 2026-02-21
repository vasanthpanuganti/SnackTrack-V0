import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../src/config/supabase.js", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
      admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) },
    },
  },
  createUserClient: vi.fn(),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createTestApp, mockAuth, seedTestUser, cleanup, TEST_USER_ID } from "./helpers.js";

const app = createTestApp();

describe("User Integration Tests", () => {
  beforeAll(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it("full user lifecycle: create, get, update, delete", async () => {
    // Seed user
    await seedTestUser();

    // Get profile
    const getRes = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", "Bearer valid-token");

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.email).toBe("integration@snacktrack.dev");
    expect(getRes.body.data.allergens).toEqual([]);
    expect(getRes.body.data.preferences).toBeNull();

    // Update profile
    const updateRes = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({ displayName: "Updated Name" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.displayName).toBe("Updated Name");

    // Set allergens
    const allergenRes = await request(app)
      .put("/api/v1/users/me/allergens")
      .set("Authorization", "Bearer valid-token")
      .send({ allergens: [{ allergenType: "peanuts", severity: "severe" }] });

    expect(allergenRes.status).toBe(200);
    expect(allergenRes.body.data).toHaveLength(1);
    expect(allergenRes.body.data[0].allergenType).toBe("peanuts");

    // Set preferences
    const prefRes = await request(app)
      .put("/api/v1/users/me/preferences")
      .set("Authorization", "Bearer valid-token")
      .send({
        dietType: "mediterranean",
        calorieTarget: 2200,
        proteinTargetG: 120,
      });

    expect(prefRes.status).toBe(200);
    expect(prefRes.body.data.dietType).toBe("mediterranean");
    expect(prefRes.body.data.calorieTarget).toBe(2200);

    // Delete account
    const deleteRes = await request(app)
      .delete("/api/v1/users/me")
      .set("Authorization", "Bearer valid-token");

    expect(deleteRes.status).toBe(200);

    // Verify deleted
    const verifyRes = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", "Bearer valid-token");

    expect(verifyRes.status).toBe(404);
  });
});
