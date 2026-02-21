import type { Request, Response } from "express";
import type { ApiResponse } from "@snacktrack/shared-types";
import { mealLogService } from "../services/meal-log.service.js";

export class MealLogController {
  async create(req: Request, res: Response<ApiResponse>) {
    const log = await mealLogService.create(req.user!.id, req.body);

    res.status(201).json({
      status: "success",
      data: log,
      error: null,
    });
  }

  async list(req: Request, res: Response<ApiResponse>) {
    const query = req.query as unknown as {
      date?: string;
      range?: "day" | "week" | "month";
      cursor?: string;
      limit?: number;
    };
    const result = await mealLogService.list(req.user!.id, query);

    res.json({
      status: "success",
      data: result,
      error: null,
    });
  }

  async delete(req: Request, res: Response<ApiResponse>) {
    await mealLogService.delete(req.user!.id, req.params.id as string);

    res.json({
      status: "success",
      data: { message: "Meal log deleted successfully" },
      error: null,
    });
  }
}

export const mealLogController = new MealLogController();
