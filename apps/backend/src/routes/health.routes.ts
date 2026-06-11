import { Router, type Router as RouterType } from "express";
import type { ApiResponse } from "@snacktrack/shared-types";
import { isDatabaseHealthy } from "../config/database.js";
import { isRedisHealthy } from "../config/redis.js";
import { mlService } from "../services/ml.service.js";

const router: RouterType = Router();

interface HealthData {
  uptime: number;
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: boolean;
    redis: boolean;
    ml: boolean;
  };
}

router.get("/", async (_req, res) => {
  // allSettled + per-check fallback: the health endpoint must always answer,
  // even when a dependency check itself throws.
  const [db, redisCheck, ml] = await Promise.allSettled([
    isDatabaseHealthy(),
    isRedisHealthy(),
    mlService.isHealthy(),
  ]);

  const dbHealthy = db.status === "fulfilled" && db.value;
  const redisHealthy = redisCheck.status === "fulfilled" && redisCheck.value;
  const mlHealthy = ml.status === "fulfilled" && ml.value;

  // Database and Redis are hard dependencies: without them the API cannot
  // serve traffic and the orchestrator should recycle the instance.
  // ML is reported for observability but is non-fatal — recommendation
  // endpoints degrade gracefully to the general catalog when ML is down.
  const coreHealthy = dbHealthy && redisHealthy;

  const response: ApiResponse<HealthData> = {
    status: coreHealthy ? "success" : "error",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: "0.0.1",
      environment: process.env.NODE_ENV ?? "development",
      services: {
        database: dbHealthy,
        redis: redisHealthy,
        ml: mlHealthy,
      },
    },
    error: coreHealthy
      ? null
      : {
          code: "SERVICE_DEGRADED",
          message: "One or more services are unhealthy",
          details: {
            database: dbHealthy ? "healthy" : "unhealthy",
            redis: redisHealthy ? "healthy" : "unhealthy",
            ml: mlHealthy ? "healthy" : "unhealthy",
          },
        },
  };

  res.status(coreHealthy ? 200 : 503).json(response);
});

export { router as healthRoutes };
