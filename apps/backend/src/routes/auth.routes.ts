import { Router, type Router as RouterType } from "express";
import { authController } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { RATE_LIMIT } from "../config/constants.js";
import { signupSchema, loginSchema, oauthSchema, refreshSchema } from "../schemas/auth.schema.js";
import { requireAuth } from "../middleware/auth.js";

const router: RouterType = Router();

// Strict limit on credential endpoints to slow brute-force attempts.
const authLimiter = rateLimiter(RATE_LIMIT.AUTH, "auth");

router.post("/signup", authLimiter, validate({ body: signupSchema }), (req, res) =>
  authController.signup(req, res),
);

router.post("/login", authLimiter, validate({ body: loginSchema }), (req, res) =>
  authController.login(req, res),
);

router.post("/oauth/:provider", authLimiter, validate({ params: oauthSchema }), (req, res) =>
  authController.oauth(req, res),
);

router.post("/refresh", authLimiter, validate({ body: refreshSchema }), (req, res) =>
  authController.refresh(req, res),
);

router.post("/logout", requireAuth, (req, res) => authController.logout(req, res));

export { router as authRoutes };
