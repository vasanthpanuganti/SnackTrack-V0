import type { Request, Response } from "express";
import type { ApiResponse } from "@snacktrack/shared-types";
import { foodService } from "../services/food.service.js";

export class FoodController {
  async search(req: Request, res: Response<ApiResponse>) {
    const { q, limit } = req.query as unknown as { q: string; limit: number };
    const results = await foodService.search(q, limit);

    res.json({
      status: "success",
      data: results,
      error: null,
    });
  }
}

export const foodController = new FoodController();
