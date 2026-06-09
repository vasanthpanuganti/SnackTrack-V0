import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/config/database.js", () => ({
  isDatabaseHealthy: vi.fn().mockResolvedValue(true),
  prisma: {
    user: {
      create: vi.fn(),
    },
  },
}));

vi.mock("../src/config/supabase.js", () => ({
  supabaseAdmin: {
    auth: {
      signUp: vi.fn(),
      admin: {
        deleteUser: vi.fn(),
      },
    },
  },
}));

vi.mock("../src/services/ml.service.js", () => ({
  mlService: {
    trainUserModel: vi.fn().mockResolvedValue({
      user_id: "550e8400-e29b-41d4-a716-446655440000",
      interaction_count: 0,
      is_cold_start: true,
      message: "queued",
    }),
  },
}));

vi.mock("../src/config/sentry.js", () => ({
  captureMlFailure: vi.fn(),
}));

vi.mock("../src/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { prisma } from "../src/config/database.js";
import { supabaseAdmin } from "../src/config/supabase.js";
import { mlService } from "../src/services/ml.service.js";
import { authService } from "../src/services/auth.service.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const EMAIL = "new-user@snacktrack.dev";
const SIGNUP_INPUT = {
  email: EMAIL,
  password: "Password123",
  displayName: "New User",
};

function mockSuccessfulSupabaseSignup() {
  vi.mocked(supabaseAdmin.auth.signUp).mockResolvedValue({
    data: {
      user: {
        id: USER_ID,
        email: EMAIL,
      },
      session: {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
        expires_at: 1234567890,
      },
    },
    error: null,
  } as never);
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuccessfulSupabaseSignup();
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: USER_ID,
      email: EMAIL,
      displayName: SIGNUP_INPUT.displayName,
    } as never);
    vi.mocked(supabaseAdmin.auth.admin.deleteUser).mockResolvedValue({
      data: null,
      error: null,
    } as never);
  });

  describe("signUp", () => {
    it("creates the application user row before returning signup success", async () => {
      const result = await authService.signUp(SIGNUP_INPUT);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          id: USER_ID,
          email: EMAIL,
          displayName: SIGNUP_INPUT.displayName,
        },
      });
      expect(result.user).toEqual({ id: USER_ID, email: EMAIL });
      expect(result.tokens.accessToken).toBe("access-token");
      expect(mlService.trainUserModel).toHaveBeenCalledWith(USER_ID);
    });

    it("rolls back the Supabase auth user when application user creation fails", async () => {
      vi.mocked(prisma.user.create).mockRejectedValue(new Error("database unavailable"));

      await expect(authService.signUp(SIGNUP_INPUT)).rejects.toMatchObject({
        statusCode: 500,
        code: "SIGNUP_PROFILE_FAILED",
      });

      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(USER_ID);
      expect(mlService.trainUserModel).not.toHaveBeenCalled();
    });
  });
});
