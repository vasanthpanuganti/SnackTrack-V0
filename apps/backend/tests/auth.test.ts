import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config/supabase.js", () => ({
  supabaseAdmin: {
    auth: {
      signInWithPassword: vi.fn(),
      refreshSession: vi.fn(),
      admin: {
        createUser: vi.fn(),
        listUsers: vi.fn(),
        updateUserById: vi.fn(),
        signOut: vi.fn(),
      },
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

function sessionPayload(email: string) {
  return {
    data: {
      user: { id: USER_ID, email, user_metadata: { display_name: "New User" } },
      session: {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
        expires_at: 1_735_689_600,
      },
    },
    error: null,
  };
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    it("creates a confirmed user, mints a session, and provisions the app row", async () => {
      vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
        data: { user: { id: USER_ID, email: "new@snacktrack.dev" } },
        error: null,
      } as never);
      vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValue(
        sessionPayload("new@snacktrack.dev") as never,
      );
      vi.mocked(prisma.user.upsert).mockResolvedValue({} as never);

      const result = await authService.signUp({
        email: "new@snacktrack.dev",
        password: "Correct-horse-1",
        displayName: "New User",
      });

      // Account is created already-confirmed so login works immediately
      expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "new@snacktrack.dev",
          password: "Correct-horse-1",
          email_confirm: true,
          user_metadata: { display_name: "New User" },
        }),
      );
      expect(supabaseAdmin.auth.signInWithPassword).toHaveBeenCalled();
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
      vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
        data: { user: null },
        error: { message: "A user with this email address has already been registered" },
      } as never);

      await expect(
        authService.signUp({
          email: "dupe@snacktrack.dev",
          password: "Correct-horse-1",
          displayName: "Dupe",
        }),
      ).rejects.toMatchObject({ statusCode: 409, code: "EMAIL_EXISTS" });
      expect(supabaseAdmin.auth.signInWithPassword).not.toHaveBeenCalled();
      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });
  });

  describe("signIn", () => {
    it("signs in valid credentials and provisions a missing app row", async () => {
      vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValue(
        sessionPayload("existing@snacktrack.dev") as never,
      );
      vi.mocked(prisma.user.upsert).mockResolvedValue({} as never);

      const result = await authService.signIn({
        email: "existing@snacktrack.dev",
        password: "Correct-horse-1",
      });

      // update clause must NOT overwrite displayName on an existing profile
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { id: USER_ID },
        create: expect.objectContaining({ id: USER_ID, email: "existing@snacktrack.dev" }),
        update: { email: "existing@snacktrack.dev" },
      });
      expect(result.tokens.accessToken).toBe("access-token");
    });

    it("self-heals an unconfirmed account: confirms it and retries", async () => {
      vi.mocked(supabaseAdmin.auth.signInWithPassword)
        .mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: "Email not confirmed" },
        } as never)
        .mockResolvedValueOnce(sessionPayload("stuck@snacktrack.dev") as never);
      vi.mocked(supabaseAdmin.auth.admin.listUsers).mockResolvedValue({
        data: { users: [{ id: USER_ID, email: "stuck@snacktrack.dev" }] },
        error: null,
      } as never);
      vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValue({
        data: { user: {} },
        error: null,
      } as never);
      vi.mocked(prisma.user.upsert).mockResolvedValue({} as never);

      const result = await authService.signIn({
        email: "stuck@snacktrack.dev",
        password: "Correct-horse-1",
      });

      expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
        USER_ID,
        { email_confirm: true },
      );
      expect(supabaseAdmin.auth.signInWithPassword).toHaveBeenCalledTimes(2);
      expect(result.tokens.accessToken).toBe("access-token");
    });

    it("rejects bad credentials with 401 and no provisioning", async () => {
      vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      } as never);

      await expect(
        authService.signIn({ email: "who@snacktrack.dev", password: "wrong" }),
      ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS" });
      expect(prisma.user.upsert).not.toHaveBeenCalled();
    });
  });
});
