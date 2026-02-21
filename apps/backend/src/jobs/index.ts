import type { Queue, Worker } from "bullmq";
import { closeQueueConnection } from "../config/queue.js";
import { logger } from "../utils/logger.js";
import {
  createRecipeCacheRefreshQueue,
  createRecipeCacheRefreshWorker,
} from "./recipe-cache-refresh.job.js";
import {
  createStaleRecommendationsQueue,
  createStaleRecommendationsWorker,
} from "./stale-recommendations.job.js";
import {
  createQuotaResetQueue,
  createQuotaResetWorker,
} from "./quota-reset.job.js";
import {
  createNutritionPrecomputeQueue,
  createNutritionPrecomputeWorker,
} from "./nutrition-precompute.job.js";

const queues: Queue[] = [];
const workers: Worker[] = [];

export async function initializeJobs(): Promise<void> {
  // Create queues
  const recipeCacheQueue = createRecipeCacheRefreshQueue();
  const staleRecsQueue = createStaleRecommendationsQueue();
  const quotaResetQueue = createQuotaResetQueue();
  const nutritionQueue = createNutritionPrecomputeQueue();

  queues.push(recipeCacheQueue, staleRecsQueue, quotaResetQueue, nutritionQueue);

  // Create workers
  workers.push(
    createRecipeCacheRefreshWorker(),
    createStaleRecommendationsWorker(),
    createQuotaResetWorker(),
    createNutritionPrecomputeWorker(),
  );

  // Schedule repeatable jobs
  await recipeCacheQueue.add("refresh", {}, {
    repeat: { pattern: "0 3 * * *" }, // 3 AM daily
  });

  await staleRecsQueue.add("cleanup", {}, {
    repeat: { pattern: "0 */6 * * *" }, // Every 6 hours
  });

  await quotaResetQueue.add("reset", {}, {
    repeat: { pattern: "5 0 * * *" }, // 12:05 AM daily
  });

  await nutritionQueue.add("precompute", {}, {
    repeat: { pattern: "0 * * * *" }, // Every hour
  });

  logger.info(
    { queues: queues.length, workers: workers.length },
    "Background jobs initialized",
  );
}

export async function shutdownJobs(): Promise<void> {
  logger.info("Shutting down background jobs...");

  // Close workers first (stop processing)
  await Promise.all(workers.map((w) => w.close()));
  logger.info("All workers closed");

  // Close queues
  await Promise.all(queues.map((q) => q.close()));
  logger.info("All queues closed");

  // Close the dedicated Redis connection
  await closeQueueConnection();
}

export function getQueues(): Queue[] {
  return queues;
}
