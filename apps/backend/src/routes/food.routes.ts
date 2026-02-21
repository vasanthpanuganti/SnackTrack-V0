import { Router, type Router as RouterType } from "express";
import { foodSearchSchema } from "@snacktrack/shared-types";
import { optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { foodController } from "../controllers/food.controller.js";

const router: RouterType = Router();

// GET /api/v1/food/search?q=...&limit=...
router.get(
  "/search",
  optionalAuth,
  validate({ query: foodSearchSchema }),
  (req, res) => foodController.search(req, res),
);

export { router as foodRoutes };
