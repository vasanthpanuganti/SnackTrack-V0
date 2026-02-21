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
  user: {
    id: string;
    email: string;
  };
  tokens: AuthTokens;
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

    // Warm up a per-user model in the background; auth should not fail if ML training is down.
    void mlService.trainUserModel(userId).catch((error) => {
      captureMlFailure(error, { operation: "train-after-signup", userId });
      logger.warn({ error, userId }, "ML training failed after signup");
    });

    return {
      user: {
        id: userId,
        email: data.user.email!,
      },
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

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
      },
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

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
      },
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
