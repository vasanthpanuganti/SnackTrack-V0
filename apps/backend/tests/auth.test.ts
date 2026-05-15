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
  logger: { warn: vi.fn() },
}));

import { authService } from "../src/services/auth.service.js";
import { prisma } from "../src/config/database.js";
import { supabaseAdmin } from "../src/config/supabase.js";
import { mlService } from "../src/services/ml.service.js";

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    it("provisions the app user row with the Supabase user id", async () => {
      vi.mocked(supabaseAdmin.auth.signUp).mockResolvedValue({
        data: {
          user: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            email: "new@snacktrack.dev",
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

      const result = await authService.signUp({
        email: "new@snacktrack.dev",
        password: "correct-horse-battery-staple",
        displayName: "New User",
      });

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { id: "550e8400-e29b-41d4-a716-446655440000" },
        create: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          email: "new@snacktrack.dev",
          displayName: "New User",
        },
        update: {
          email: "new@snacktrack.dev",
          displayName: "New User",
        },
      });
      expect(mlService.trainUserModel).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440000",
      );
      expect(result.user).toEqual({
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "new@snacktrack.dev",
      });
      expect(result.tokens.accessToken).toBe("access-token");
    });
  });
});
