import type { Request, Response } from "express";
import type { ApiResponse } from "@snacktrack/shared-types";
import { recipeService } from "../services/recipe.service.js";

export class RecipeController {
  async list(req: Request, res: Response<ApiResponse>) {
    const query = req.query as unknown as {
      search?: string;
      diet?: string;
      maxReadyTime?: number;
      page: number;
      limit: number;
    };

    const data = await recipeService.listRecipes(query, req.user?.id);

    res.json({
      status: "success",
      data,
      error: null,
    });
  }

  async getRecommendations(req: Request, res: Response<ApiResponse>) {
    const rawLimit = Number(req.query.limit ?? 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(50, Math.floor(rawLimit)))
      : 10;

    const data = await recipeService.getRecommendationsForUser(req.user!.id, limit);

    res.json({
      status: "success",
      data,
      error: null,
    });
  }

  async getById(req: Request, res: Response<ApiResponse>) {
    const recipe = await recipeService.getRecipeById(req.params.id as string);

    res.json({
      status: "success",
      data: recipe,
      error: null,
    });
  }
}

export const recipeController = new RecipeController();
