import { supabaseAdmin } from "../config/supabase.js";
import { prisma } from "../config/database.js";
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
  /**
   * Find a Supabase auth user by email via the admin API. GoTrue paginates,
   * so we scan a bounded number of pages. Used only for the login self-heal.
   */
  private async findAuthUserByEmail(email: string) {
    const target = email.toLowerCase();
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) return null;
      const match = data.users.find((u) => u.email?.toLowerCase() === target);
      if (match) return match;
      if (data.users.length < 200) break; // last page reached
    }
    return null;
  }

  async signUp(input: SignupInput): Promise<AuthResult> {
    // Create an already-confirmed user via admin privileges so the account is
    // usable immediately — the app signs users in right after signup. This
    // works regardless of the project's "Confirm email" setting (the plain
    // signUp flow returns no session when confirmation is required).
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { display_name: input.displayName },
      });

    if (createError) {
      logger.warn({ error: createError }, "Signup failed");
      const msg = createError.message?.toLowerCase() ?? "";
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists")
      ) {
        throw new AppError(
          409,
          "EMAIL_EXISTS",
          "An account with this email already exists",
        );
      }
      throw new AppError(400, "SIGNUP_FAILED", createError.message);
    }

    if (!created.user) {
      throw new AppError(400, "SIGNUP_FAILED", "Failed to create account");
    }

    // Mint a session for the freshly created (confirmed) user.
    const { data: session, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

    if (signInError || !session.user || !session.session) {
      logger.error({ error: signInError }, "Sign-in after signup failed");
      throw new AppError(
        500,
        "SIGNUP_FAILED",
        "Account created but automatic sign-in failed. Please log in.",
      );
    }

    const userId = session.user.id;
    const email = session.user.email ?? input.email;

    // Provision the application user row with the Supabase user id —
    // every domain table (logs, plans, preferences) hangs off this record.
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        displayName: input.displayName,
      },
      update: {
        email,
        displayName: input.displayName,
      },
    });

    // Warm up a per-user model in the background; auth should not fail if ML training is down.
    void mlService.trainUserModel(userId).catch((error) => {
      captureMlFailure(error, { operation: "train-after-signup", userId });
      logger.warn({ error, userId }, "ML training failed after signup");
    });

    return {
      user: {
        id: userId,
        email,
      },
      tokens: {
        accessToken: session.session.access_token,
        refreshToken: session.session.refresh_token,
        expiresIn: session.session.expires_in,
        expiresAt: session.session.expires_at ?? 0,
      },
    };
  }

  async signIn(input: LoginInput): Promise<AuthResult> {
    let { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    // Self-heal: an account left unconfirmed (e.g. created by an older signup
    // flow, or an interrupted attempt) would reject valid credentials forever.
    // Confirm it once via admin and retry so the user isn't locked out.
    if (error && /not confirmed/i.test(error.message ?? "")) {
      const existing = await this.findAuthUserByEmail(input.email);
      if (existing) {
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          email_confirm: true,
        });
        ({ data, error } = await supabaseAdmin.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        }));
      }
    }

    if (error || !data.user || !data.session) {
      logger.warn({ error }, "Login failed");
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    // Self-heal: create the app user row if it's missing, but never clobber an
    // existing profile.
    await prisma.user.upsert({
      where: { id: data.user.id },
      create: {
        id: data.user.id,
        email: data.user.email ?? input.email,
        displayName:
          (data.user.user_metadata?.display_name as string | undefined) ?? null,
      },
      update: { email: data.user.email ?? input.email },
    });

    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? input.email,
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
