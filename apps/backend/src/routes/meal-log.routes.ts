import { Router, type Router as RouterType } from "express";
import {
  createMealLogSchema,
  mealLogQuerySchema,
} from "@snacktrack/shared-types";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { mealLogController } from "../controllers/meal-log.controller.js";

const router: RouterType = Router();

// POST /api/v1/meal-logs
router.post(
  "/",
  requireAuth,
  validate({ body: createMealLogSchema }),
  (req, res) => mealLogController.create(req, res),
);

// GET /api/v1/meal-logs
router.get(
  "/",
  requireAuth,
  validate({ query: mealLogQuerySchema }),
  (req, res) => mealLogController.list(req, res),
);

// DELETE /api/v1/meal-logs/:id
router.delete("/:id", requireAuth, (req, res) =>
  mealLogController.delete(req, res),
);

export { router as mealLogRoutes };
