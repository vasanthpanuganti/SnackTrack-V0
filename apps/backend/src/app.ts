import express, { type Express } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { apiRoutes } from "./routes/index.js";
import { API_PREFIX, RATE_LIMIT } from "./config/constants.js";
import { env } from "./config/env.js";

export function createApp(): Express {
  const app = express();

  // Running behind a reverse proxy / load balancer in production:
  // needed so req.ip reflects the client (rate limiting) and
  // req.protocol reflects the original scheme.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Security headers
  app.use(helmet());

  // CORS
  const parsed = env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  const origins = parsed.length > 0 ? parsed : ["http://localhost:3000"];
  app.use(cors({ origin: origins, credentials: true }));

  // Response compression (gzip/brotli) for JSON payloads
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  // Request tracking
  app.use(requestIdMiddleware);

  // Global rate limit (per user/IP). Auth routes apply a stricter limit on top.
  // Health probes are exempt so load balancers are never throttled.
  const globalLimiter = rateLimiter(RATE_LIMIT.GLOBAL, "global");
  app.use(API_PREFIX, (req, res, next) => {
    if (req.path.startsWith("/health")) return next();
    return globalLimiter(req, res, next);
  });

  // API routes
  app.use(API_PREFIX, apiRoutes);

  // Error handling (must be after routes)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
