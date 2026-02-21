import type { Request, Response } from "express";
import type { ApiResponse } from "@snacktrack/shared-types";
import { mealPlanService } from "../services/meal-plan.service.js";

export class MealPlanController {
  async generate(req: Request, res: Response<ApiResponse>) {
    const plan = await mealPlanService.generate(req.user!.id, req.body);

    res.status(201).json({
      status: "success",
      data: plan,
      error: null,
    });
  }

  async list(req: Request, res: Response<ApiResponse>) {
    const { cursor, limit } = req.query as unknown as {
      cursor?: string;
      limit?: number;
    };
    const result = await mealPlanService.listPlans(
      req.user!.id,
      cursor,
      limit,
    );

    res.json({
      status: "success",
      data: result,
      error: null,
    });
  }

  async getById(req: Request, res: Response<ApiResponse>) {
    const plan = await mealPlanService.getPlan(
      req.user!.id,
      req.params.id as string,
    );

    res.json({
      status: "success",
      data: plan,
      error: null,
    });
  }

  async swap(req: Request, res: Response<ApiResponse>) {
    const item = await mealPlanService.swapMeal(
      req.user!.id,
      req.params.id as string,
      req.body,
    );

    res.json({
      status: "success",
      data: item,
      error: null,
    });
  }

  async update(req: Request, res: Response<ApiResponse>) {
    const plan = await mealPlanService.updatePlan(
      req.user!.id,
      req.params.id as string,
      req.body,
    );

    res.json({
      status: "success",
      data: plan,
      error: null,
    });
  }

  async delete(req: Request, res: Response<ApiResponse>) {
    await mealPlanService.deletePlan(req.user!.id, req.params.id as string);

    res.json({
      status: "success",
      data: { message: "Meal plan deleted successfully" },
      error: null,
    });
  }
}

export const mealPlanController = new MealPlanController();
