import { Router, type Router as RouterType } from "express";
import {
  updateProfileSchema,
  updateAllergensSchema,
  updatePreferencesSchema,
} from "@snacktrack/shared-types";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { userController } from "../controllers/user.controller.js";

const router: RouterType = Router();

// GET /api/v1/users/me - Get current user's full profile
router.get("/me", requireAuth, (req, res) => userController.getProfile(req, res));

// PATCH /api/v1/users/me - Update profile fields
router.patch(
  "/me",
  requireAuth,
  validate({ body: updateProfileSchema }),
  (req, res) => userController.updateProfile(req, res),
);

// PUT /api/v1/users/me/allergens - Replace all allergens
router.put(
  "/me/allergens",
  requireAuth,
  validate({ body: updateAllergensSchema }),
  (req, res) => userController.updateAllergens(req, res),
);

// PUT /api/v1/users/me/preferences - Upsert dietary preferences
router.put(
  "/me/preferences",
  requireAuth,
  validate({ body: updatePreferencesSchema }),
  (req, res) => userController.updatePreferences(req, res),
);

// DELETE /api/v1/users/me - Delete account
router.delete("/me", requireAuth, (req, res) =>
  userController.deleteAccount(req, res),
);

export { router as userRoutes };
