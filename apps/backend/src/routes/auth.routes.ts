import { Router, type Router as RouterType } from "express";
import { authController } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { signupSchema, loginSchema, oauthSchema, refreshSchema } from "../schemas/auth.schema.js";
import { requireAuth } from "../middleware/auth.js";

const router: RouterType = Router();

router.post("/signup", validate({ body: signupSchema }), (req, res) =>
  authController.signup(req, res),
);

router.post("/login", validate({ body: loginSchema }), (req, res) =>
  authController.login(req, res),
);

router.post("/oauth/:provider", validate({ params: oauthSchema }), (req, res) =>
  authController.oauth(req, res),
);

router.post("/refresh", validate({ body: refreshSchema }), (req, res) =>
  authController.refresh(req, res),
);

router.post("/logout", requireAuth, (req, res) => authController.logout(req, res));

export { router as authRoutes };
