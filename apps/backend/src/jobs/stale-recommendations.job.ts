import { Queue, Worker, type Job } from "bullmq";
import { getQueueConnection } from "../config/queue.js";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

const QUEUE_NAME = "stale-recommendations";

export function createStaleRecommendationsQueue(): Queue {
  return new Queue(QUEUE_NAME, {
    connection: getQueueConnection(),
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 25,
      attempts: 2,
      backoff: { type: "exponential", delay: 3000 },
    },
  });
}

export function createStaleRecommendationsWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      logger.info({ jobId: job.id }, "Starting stale recommendations cleanup");

      const cutoff = new Date(Date.now() - 7 * 86400 * 1000); // 7 days old

      const result = await prisma.recommendationCache.deleteMany({
        where: { generatedAt: { lt: cutoff } },
      });

      logger.info({ deleted: result.count }, "Stale recommendations cleanup complete");
      return { deleted: result.count };
    },
    { connection: getQueueConnection(), concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Stale recommendations cleanup failed");
  });

  return worker;
}
