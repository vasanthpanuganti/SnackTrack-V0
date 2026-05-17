import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../src/config/database.js", () => ({
  isDatabaseHealthy: vi.fn().mockResolvedValue(true),
  prisma: {
    user: {
      upsert: vi.fn(),
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
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      refreshSession: vi.fn(),
      getUser: vi.fn(),
      admin: {
        deleteUser: vi.fn(),
        signOut: vi.fn(),
      },
    },
  },
  createUserClient: vi.fn(),
}));

vi.mock("../src/services/ml.service.js", () => ({
  mlService: {
    trainUserModel: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../src/config/sentry.js", () => ({
  captureMlFailure: vi.fn(),
}));

vi.mock("../src/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createApp } from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { supabaseAdmin } from "../src/config/supabase.js";
import { mlService } from "../src/services/ml.service.js";

const app = createApp();
const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const TEST_EMAIL = "new-user@snacktrack.dev";

const appUser = {
  id: TEST_USER_ID,
  email: TEST_EMAIL,
  displayName: "New User",
  dateOfBirth: null,
  gender: null,
  heightCm: null,
  weightKg: null,
  activityLevel: null,
  healthGoal: null,
  unitPreference: "metric",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("Auth endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the application user row during signup", async () => {
    vi.mocked(supabaseAdmin.auth.signUp).mockResolvedValue({
      data: {
        user: {
          id: TEST_USER_ID,
          email: TEST_EMAIL,
        },
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          expires_at: 1770000000,
        },
      },
      error: null,
    } as never);
    vi.mocked(prisma.user.upsert).mockResolvedValue(appUser as never);

    const res = await request(app).post("/api/v1/auth/signup").send({
      email: TEST_EMAIL,
      password: "Password1",
      displayName: "New User",
    });

    expect(res.status).toBe(201);
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { id: TEST_USER_ID },
      create: {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        displayName: "New User",
      },
      update: {
        email: TEST_EMAIL,
        displayName: "New User",
      },
    });
    expect(res.body.data.user.id).toBe(TEST_USER_ID);
    expect(res.body.data.user.unitPreference).toBe("metric");
    expect(res.body.data.tokens.accessToken).toBe("access-token");
    expect(res.body.data.tokens.refreshToken).toBe("refresh-token");
    expect(mlService.trainUserModel).toHaveBeenCalledWith(TEST_USER_ID);
  });
});
