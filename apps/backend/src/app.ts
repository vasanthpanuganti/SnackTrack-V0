import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { apiRoutes } from "./routes/index.js";
import { API_PREFIX } from "./config/constants.js";

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  const origins = process.env.CORS_ORIGINS?.split(",") ?? ["http://localhost:3000"];
  app.use(cors({ origin: origins, credentials: true }));

  // Body parsing
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  // Request tracking
  app.use(requestIdMiddleware);

  // API routes
  app.use(API_PREFIX, apiRoutes);

  // Error handling (must be after routes)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
