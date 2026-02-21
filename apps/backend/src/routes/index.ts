import { Router, type Router as RouterType } from "express";
import { healthRoutes } from "./health.routes.js";
import { authRoutes } from "./auth.routes.js";
import { userRoutes } from "./user.routes.js";
import { foodRoutes } from "./food.routes.js";
import { recipeRoutes } from "./recipe.routes.js";
import { mealPlanRoutes } from "./meal-plan.routes.js";
import { mealLogRoutes } from "./meal-log.routes.js";
import { nutritionRoutes } from "./nutrition.routes.js";
import { adminRoutes } from "./admin.routes.js";

const router: RouterType = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/food", foodRoutes);
router.use("/recipes", recipeRoutes);
router.use("/meal-plans", mealPlanRoutes);
router.use("/meal-logs", mealLogRoutes);
router.use("/nutrition", nutritionRoutes);
router.use("/admin", adminRoutes);

export { router as apiRoutes };
