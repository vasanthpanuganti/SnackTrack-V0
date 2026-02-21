import type { Request, Response } from "express";
import type { ApiResponse } from "@snacktrack/shared-types";
import { userService } from "../services/user.service.js";

export class UserController {
  async getProfile(req: Request, res: Response<ApiResponse>) {
    const profile = await userService.getFullProfile(req.user!.id);

    res.json({
      status: "success",
      data: profile,
      error: null,
    });
  }

  async updateProfile(req: Request, res: Response<ApiResponse>) {
    const user = await userService.updateProfile(req.user!.id, req.body);

    res.json({
      status: "success",
      data: user,
      error: null,
    });
  }

  async updateAllergens(req: Request, res: Response<ApiResponse>) {
    const allergens = await userService.replaceAllergens(
      req.user!.id,
      req.body.allergens,
    );

    res.json({
      status: "success",
      data: allergens,
      error: null,
    });
  }

  async updatePreferences(req: Request, res: Response<ApiResponse>) {
    const preferences = await userService.upsertPreferences(
      req.user!.id,
      req.body,
    );

    res.json({
      status: "success",
      data: preferences,
      error: null,
    });
  }

  async deleteAccount(req: Request, res: Response<ApiResponse>) {
    await userService.deleteAccount(req.user!.id);

    res.json({
      status: "success",
      data: { message: "Account deleted successfully" },
      error: null,
    });
  }
}

export const userController = new UserController();
