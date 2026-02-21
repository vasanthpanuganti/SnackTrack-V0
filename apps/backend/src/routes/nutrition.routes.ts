import { Router, type Router as RouterType } from "express";
import {
  dailyNutritionQuerySchema,
  weeklyNutritionQuerySchema,
} from "@snacktrack/shared-types";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { nutritionController } from "../controllers/nutrition.controller.js";

const router: RouterType = Router();

// GET /api/v1/nutrition/daily?date=YYYY-MM-DD
router.get(
  "/daily",
  requireAuth,
  validate({ query: dailyNutritionQuerySchema }),
  (req, res) => nutritionController.daily(req, res),
);

// GET /api/v1/nutrition/weekly?week=YYYY-MM-DD
router.get(
  "/weekly",
  requireAuth,
  validate({ query: weeklyNutritionQuerySchema }),
  (req, res) => nutritionController.weekly(req, res),
);

export { router as nutritionRoutes };
