import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config/supabase.js", () => ({
  supabaseAdmin: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      refreshSession: vi.fn(),
      admin: { signOut: vi.fn() },
    },
  },
}));

vi.mock("../src/config/database.js", () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
    },
  },
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

import { authService } from "../src/services/auth.service.js";
import { prisma } from "../src/config/database.js";
import { supabaseAdmin } from "../src/config/supabase.js";
import { mlService } from "../src/services/ml.service.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    it("provisions the app user row with the Supabase user id", async () => {
      vi.mocked(supabaseAdmin.auth.signUp).mockResolvedValue({
        data: {
          user: { id: USER_ID, email: "new@snacktrack.dev" },
          session: {
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            expires_at: 1_735_689_600,
          },
        },
        error: null,
      } as never);
      vi.mocked(prisma.user.upsert).mockResolvedValue({} as never);

      const result = await authService.signUp({
        email: "new@snacktrack.dev",
        password: "Correct-horse-1",
        displayName: "New User",
      });

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { id: USER_ID },
        create: {
          id: USER_ID,
          email: "new@snacktrack.dev",
          displayName: "New User",
        },
        update: {
          email: "new@snacktrack.dev",
          displayName: "New User",
        },
      });
      expect(mlService.trainUserModel).toHaveBeenCalledWith(USER_ID);
      expect(result.user).toEqual({ id: USER_ID, email: "new@snacktrack.dev" });
      expect(result.tokens.accessToken).toBe("access-token");
    });

    it("maps duplicate email errors to 409 EMAIL_EXISTS", async () => {
      vi.mocked(supabaseAdmin.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      } as never);

      await expect(
        authService.signUp({
          email: "dupe@snacktrack.dev",
          password: "Correct-horse-1",
          displayName: "Dupe",
        }),
      ).rejects.toMatchObject({ statusCode: 409, code: "EMAIL_EXISTS" });
      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });
  });

  describe("signIn", () => {
    it("self-heals a missing app user row without clobbering the profile", async () => {
      vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: {
            id: USER_ID,
            email: "existing@snacktrack.dev",
            user_metadata: { display_name: "Existing User" },
          },
          session: {
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            expires_at: 1_735_689_600,
          },
        },
        error: null,
      } as never);
      vi.mocked(prisma.user.upsert).mockResolvedValue({} as never);

      const result = await authService.signIn({
        email: "existing@snacktrack.dev",
        password: "Correct-horse-1",
      });

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { id: USER_ID },
        create: {
          id: USER_ID,
          email: "existing@snacktrack.dev",
          displayName: "Existing User",
        },
        // update must not overwrite displayName or other profile fields
        update: { email: "existing@snacktrack.dev" },
      });
      expect(result.user).toEqual({
        id: USER_ID,
        email: "existing@snacktrack.dev",
      });
    });

    it("rejects bad credentials with 401 and no provisioning", async () => {
      vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      } as never);

      await expect(
        authService.signIn({
          email: "who@snacktrack.dev",
          password: "wrong",
        }),
      ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS" });
      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });
  });
});
