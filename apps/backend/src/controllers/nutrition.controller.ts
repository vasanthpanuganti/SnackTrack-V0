import type { Request, Response } from "express";
import type { ApiResponse } from "@snacktrack/shared-types";
import { nutritionService } from "../services/nutrition.service.js";

export class NutritionController {
  async daily(req: Request, res: Response<ApiResponse>) {
    const { date } = req.query as unknown as { date: string };
    const summary = await nutritionService.getDailySummary(req.user!.id, date);

    res.json({
      status: "success",
      data: summary,
      error: null,
    });
  }

  async weekly(req: Request, res: Response<ApiResponse>) {
    const { week } = req.query as unknown as { week: string };
    const summary = await nutritionService.getWeeklySummary(req.user!.id, week);

    res.json({
      status: "success",
      data: summary,
      error: null,
    });
  }
}

export const nutritionController = new NutritionController();
