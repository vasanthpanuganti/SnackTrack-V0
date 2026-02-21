import { Queue, Worker, type Job } from "bullmq";
import { getQueueConnection } from "../config/queue.js";
import { redis } from "../config/redis.js";
import { logger } from "../utils/logger.js";

const QUEUE_NAME = "quota-reset";

export function createQuotaResetQueue(): Queue {
  return new Queue(QUEUE_NAME, {
    connection: getQueueConnection(),
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 25,
      attempts: 2,
    },
  });
}

export function createQuotaResetWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      logger.info({ jobId: job.id }, "Starting Spoonacular quota key cleanup");

      // Clean up old quota keys (older than yesterday)
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400 * 1000).toISOString().split("T")[0];

      let deleted = 0;
      const keys = await redis.keys("spoonacular:daily:*");
      for (const key of keys) {
        const dateStr = key.replace("spoonacular:daily:", "");
        if (dateStr < yesterday && dateStr !== today) {
          await redis.del(key);
          deleted++;
        }
      }

      logger.info({ deleted }, "Spoonacular quota key cleanup complete");
      return { deleted };
    },
    { connection: getQueueConnection(), concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Quota reset job failed");
  });

  return worker;
}
