import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/AppError.js";

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "Missing or malformed authorization header"));
  }

  const token = header.slice(7);

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }

  // OAuth providers can issue accounts without an email; we require one
  // because it anchors the application user record.
  if (!user.email) {
    return next(new AppError(401, "UNAUTHORIZED", "Account has no email address"));
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role ?? "user",
  };

  next();
}

// Optional auth -- does not throw, just attaches user if valid token present
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const token = header.slice(7);
      const {
        data: { user },
      } = await supabaseAdmin.auth.getUser(token);
      if (user?.email) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role ?? "user",
        };
      }
    } catch {
      // Silently continue without auth
    }
  }
  next();
}
