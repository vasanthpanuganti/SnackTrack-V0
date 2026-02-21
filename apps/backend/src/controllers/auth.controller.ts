import type { Request, Response } from "express";
import type { ApiResponse } from "@snacktrack/shared-types";
import { authService } from "../services/auth.service.js";
import type { SignupInput, LoginInput, RefreshInput } from "../schemas/auth.schema.js";

export class AuthController {
  async signup(req: Request<unknown, unknown, SignupInput>, res: Response<ApiResponse>) {
    const result = await authService.signUp(req.body);

    res.status(201).json({
      status: "success",
      data: result,
      error: null,
    });
  }

  async login(req: Request<unknown, unknown, LoginInput>, res: Response<ApiResponse>) {
    const result = await authService.signIn(req.body);

    res.json({
      status: "success",
      data: result,
      error: null,
    });
  }

  async oauth(req: Request, res: Response<ApiResponse>) {
    const provider = req.params.provider as "google" | "apple";
    const redirectTo = (req.query.redirectTo as string) ?? `${req.protocol}://${req.get("host")}/api/v1/auth/callback`;

    const result = await authService.oauthSignIn(provider, redirectTo);

    res.json({
      status: "success",
      data: result,
      error: null,
    });
  }

  async refresh(req: Request<unknown, unknown, RefreshInput>, res: Response<ApiResponse>) {
    const result = await authService.refreshSession(req.body);

    res.json({
      status: "success",
      data: result,
      error: null,
    });
  }

  async logout(req: Request, res: Response<ApiResponse>) {
    const token = req.headers.authorization?.slice(7) ?? "";
    await authService.signOut(token);

    res.json({
      status: "success",
      data: { message: "Logged out successfully" },
      error: null,
    });
  }
}

export const authController = new AuthController();
