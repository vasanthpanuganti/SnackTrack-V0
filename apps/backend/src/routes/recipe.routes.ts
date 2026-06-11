import { Router, type Router as RouterType } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { recipeController } from "../controllers/recipe.controller.js";
import { uuidParamSchema } from "../schemas/meal-plan.schema.js";
import { recipeListQuerySchema } from "../schemas/recipe.schema.js";

const router: RouterType = Router();

// GET /api/v1/recipes?search=&diet=&maxReadyTime=&page=&limit=
// Browse/search the recipe catalog. Auth is optional; authenticated users
// get allergen-aware results.
router.get(
  "/",
  optionalAuth,
  validate({ query: recipeListQuerySchema }),
  (req, res) => recipeController.list(req, res),
);

// GET /api/v1/recipes/recommendations?limit=10
// Requires auth because recommendations are personalized per user.
router.get("/recommendations", requireAuth, (req, res) =>
  recipeController.getRecommendations(req, res),
);

// GET /api/v1/recipes/:id
router.get(
  "/:id",
  optionalAuth,
  validate({ params: uuidParamSchema }),
  (req, res) => recipeController.getById(req, res),
);

export { router as recipeRoutes };
