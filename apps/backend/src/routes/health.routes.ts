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
  const [dbHealthy, redisHealthy, mlHealthy] = await Promise.all([
    isDatabaseHealthy(),
    isRedisHealthy(),
    mlService.isHealthy(),
  ]);

  const allHealthy = dbHealthy && redisHealthy && mlHealthy;

  const response: ApiResponse<HealthData> = {
    status: allHealthy ? "success" : "error",
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
    error: allHealthy
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

  res.status(allHealthy ? 200 : 503).json(response);
});

export { router as healthRoutes };
