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
      admin: { signOut: vi.fn() },
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

const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440123";
const TEST_EMAIL = "new-user@snacktrack.dev";
const session = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_in: 3600,
  expires_at: 1234567890,
};

describe("Auth endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.upsert).mockResolvedValue({} as never);
  });

  it("creates the application user row after Supabase signup succeeds", async () => {
    vi.mocked(supabaseAdmin.auth.signUp).mockResolvedValue({
      data: {
        user: { id: TEST_USER_ID, email: TEST_EMAIL },
        session,
      },
      error: null,
    } as never);

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
    expect(mlService.trainUserModel).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it("repairs a missing application user row after login succeeds", async () => {
    vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValue({
      data: {
        user: {
          id: TEST_USER_ID,
          email: TEST_EMAIL,
          user_metadata: { display_name: "Existing User" },
        },
        session,
      },
      error: null,
    } as never);

    const res = await request(app).post("/api/v1/auth/login").send({
      email: TEST_EMAIL,
      password: "Password1",
    });

    expect(res.status).toBe(200);
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { id: TEST_USER_ID },
      create: {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        displayName: "Existing User",
      },
      update: {
        email: TEST_EMAIL,
      },
    });
  });
});
