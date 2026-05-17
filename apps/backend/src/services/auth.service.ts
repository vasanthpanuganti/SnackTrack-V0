import type { Prisma } from "@prisma/client";
import type { User } from "@snacktrack/shared-types";
import { prisma } from "../config/database.js";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import type { SignupInput, LoginInput, RefreshInput } from "../schemas/auth.schema.js";
import { mlService } from "./ml.service.js";
import { captureMlFailure } from "../config/sentry.js";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

function mapUser(user: Prisma.UserGetPayload<object>): User {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    dateOfBirth: user.dateOfBirth?.toISOString().split("T")[0] ?? null,
    gender: user.gender as User["gender"],
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    activityLevel: user.activityLevel as User["activityLevel"],
    healthGoal: user.healthGoal as User["healthGoal"],
    unitPreference: user.unitPreference as User["unitPreference"],
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

async function ensureAppUser(
  userId: string,
  email: string,
  displayName?: string | null,
): Promise<User> {
  const user = await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email,
      displayName: displayName ?? null,
    },
    update: {
      email,
      ...(displayName !== undefined ? { displayName } : {}),
    },
  });

  return mapUser(user);
}

export class AuthService {
  async signUp(input: SignupInput): Promise<AuthResult> {
    const { data, error } = await supabaseAdmin.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { display_name: input.displayName },
      },
    });

    if (error) {
      logger.warn({ error }, "Signup failed");
      if (error.message.includes("already registered")) {
        throw new AppError(409, "EMAIL_EXISTS", "An account with this email already exists");
      }
      throw new AppError(400, "SIGNUP_FAILED", error.message);
    }

    if (!data.user || !data.session) {
      throw new AppError(400, "SIGNUP_FAILED", "Failed to create account");
    }
    const userId = data.user.id;
    let user: User;

    try {
      user = await ensureAppUser(userId, data.user.email!, input.displayName);
    } catch (error) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (cleanupError) {
        logger.error(
          { cleanupError, userId },
          "Failed to clean up Supabase user after signup rollback",
        );
      }
      logger.error({ error, userId }, "Failed to create application user during signup");
      throw new AppError(500, "SIGNUP_FAILED", "Failed to create account");
    }

    // Warm up a per-user model in the background; auth should not fail if ML training is down.
    void mlService.trainUserModel(userId).catch((error) => {
      captureMlFailure(error, { operation: "train-after-signup", userId });
      logger.warn({ error, userId }, "ML training failed after signup");
    });

    return {
      user,
      tokens: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        expiresAt: data.session.expires_at ?? 0,
      },
    };
  }

  async signIn(input: LoginInput): Promise<AuthResult> {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      logger.warn({ error }, "Login failed");
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    if (!data.user || !data.session) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    const user = await ensureAppUser(data.user.id, data.user.email!);

    return {
      user,
      tokens: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        expiresAt: data.session.expires_at ?? 0,
      },
    };
  }

  async oauthSignIn(provider: "google" | "apple", redirectTo: string) {
    const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) {
      throw new AppError(400, "OAUTH_FAILED", error.message);
    }

    return { url: data.url };
  }

  async refreshSession(input: RefreshInput): Promise<AuthResult> {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: input.refreshToken,
    });

    if (error || !data.user || !data.session) {
      throw new AppError(401, "REFRESH_FAILED", "Invalid or expired refresh token");
    }
    const user = await ensureAppUser(data.user.id, data.user.email!);

    return {
      user,
      tokens: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        expiresAt: data.session.expires_at ?? 0,
      },
    };
  }

  async signOut(accessToken: string): Promise<void> {
    const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);
    if (error) {
      logger.warn({ error }, "Signout failed (non-critical)");
    }
  }
}

export const authService = new AuthService();
