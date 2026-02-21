import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { prisma } from "./config/database.js";
import { redis } from "./config/redis.js";
import { initializeJobs, shutdownJobs } from "./jobs/index.js";
import { mlService } from "./services/ml.service.js";
import { initializeSentry } from "./config/sentry.js";

initializeSentry();

const app = createApp();
let server: ReturnType<typeof app.listen> | null = null;

async function startServer() {
  // ML is a core dependency: fail fast on startup if the model service is unhealthy.
  if (env.NODE_ENV !== "test") {
    const mlHealthy = await mlService.isHealthy();
    if (!mlHealthy) {
      logger.error(
        { mlServiceUrl: env.ML_SERVICE_URL },
        "ML service is required but unhealthy. Refusing to start API.",
      );
      process.exit(1);
    }
  }

  server = app.listen(env.PORT, async () => {
    logger.info(`SnackTrack API server running on port ${env.PORT}`);
    logger.info(`Health check: http://localhost:${env.PORT}/api/v1/health`);

    // Initialize background jobs after server is ready
    try {
      await initializeJobs();
    } catch (err) {
      logger.error({ err }, "Failed to initialize background jobs");
    }
  });
}

void startServer().catch((err) => {
  logger.error({ err }, "Failed to start backend server");
  process.exit(1);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);

  if (!server) {
    process.exit(0);
  }

  server.close(async () => {
    logger.info("HTTP server closed");

    // Drain background jobs first
    try {
      await shutdownJobs();
    } catch (err) {
      logger.error({ err }, "Error shutting down background jobs");
    }

    try {
      await prisma.$disconnect();
      logger.info("Prisma disconnected");
    } catch (err) {
      logger.error({ err }, "Error disconnecting Prisma");
    }

    try {
      await redis.quit();
      logger.info("Redis disconnected");
    } catch (err) {
      logger.error({ err }, "Error disconnecting Redis");
    }

    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
