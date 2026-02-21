import { Router, type Router as RouterType } from "express";
import {
  generateMealPlanSchema,
  swapMealSchema,
  cursorPaginationSchema,
} from "@snacktrack/shared-types";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { mealPlanController } from "../controllers/meal-plan.controller.js";
import { updateMealPlanSchema } from "../schemas/meal-plan.schema.js";

const router: RouterType = Router();

// POST /api/v1/meal-plans/generate
router.post(
  "/generate",
  requireAuth,
  validate({ body: generateMealPlanSchema }),
  (req, res) => mealPlanController.generate(req, res),
);

// GET /api/v1/meal-plans
router.get(
  "/",
  requireAuth,
  validate({ query: cursorPaginationSchema }),
  (req, res) => mealPlanController.list(req, res),
);

// GET /api/v1/meal-plans/:id
router.get("/:id", requireAuth, (req, res) =>
  mealPlanController.getById(req, res),
);

// POST /api/v1/meal-plans/:id/swap
router.post(
  "/:id/swap",
  requireAuth,
  validate({ body: swapMealSchema }),
  (req, res) => mealPlanController.swap(req, res),
);

// PATCH /api/v1/meal-plans/:id
router.patch(
  "/:id",
  requireAuth,
  validate({ body: updateMealPlanSchema }),
  (req, res) => mealPlanController.update(req, res),
);

// DELETE /api/v1/meal-plans/:id
router.delete("/:id", requireAuth, (req, res) =>
  mealPlanController.delete(req, res),
);

export { router as mealPlanRoutes };
