import type { Request, Response } from "express";
import type { ApiResponse } from "@snacktrack/shared-types";
import { recipeService } from "../services/recipe.service.js";

export class RecipeController {
  async list(req: Request, res: Response<ApiResponse>) {
    const rawLimit = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(50, Math.floor(rawLimit)))
      : 20;
    const rawMaxReady = Number(req.query.maxReadyInMinutes ?? req.query.maxReadyTime);
    const maxReadyInMinutes = Number.isFinite(rawMaxReady) ? rawMaxReady : undefined;
    const diet = typeof req.query.diet === "string" ? req.query.diet : undefined;

    const recipes = await recipeService.getCachedRecipes({
      diet,
      maxReadyInMinutes,
      limit,
    });

    res.json({
      status: "success",
      data: {
        recipes,
        total: recipes.length,
        page: 1,
        limit,
      },
      error: null,
    });
  }

  async search(req: Request, res: Response<ApiResponse>) {
    const { q, limit } = req.query as unknown as { q: string; limit: number };
    const recipes = await recipeService.searchRecipes(q, limit, req.user?.id);

    res.json({
      status: "success",
      data: {
        recipes,
        total: recipes.length,
        page: 1,
        limit,
      },
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
