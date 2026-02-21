import { Queue, Worker, type Job } from "bullmq";
import { getQueueConnection } from "../config/queue.js";
import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import { nutritionService } from "../services/nutrition.service.js";
import { CACHE_TTL } from "../config/constants.js";

const QUEUE_NAME = "nutrition-precompute";

export function createNutritionPrecomputeQueue(): Queue {
  return new Queue(QUEUE_NAME, {
    connection: getQueueConnection(),
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 2,
      backoff: { type: "exponential", delay: 3000 },
    },
  });
}

export function createNutritionPrecomputeWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      logger.info({ jobId: job.id }, "Starting nutrition precompute");

      const today = new Date().toISOString().split("T")[0]!;

      // Find users who have logged meals today
      const activeUsers = await prisma.mealLog.findMany({
        where: {
          loggedAt: {
            gte: new Date(today),
            lt: new Date(new Date(today).getTime() + 86400 * 1000),
          },
        },
        select: { userId: true },
        distinct: ["userId"],
      });

      let cached = 0;
      for (const { userId } of activeUsers) {
        try {
          const summary = await nutritionService.getDailySummary(userId, today);
          const cacheKey = `nutrition:daily:${userId}:${today}`;
          await redis.setex(cacheKey, CACHE_TTL.NUTRITION, JSON.stringify(summary));
          cached++;
        } catch (error) {
          logger.warn({ error, userId }, "Failed to precompute nutrition for user");
        }
      }

      logger.info({ cached, totalUsers: activeUsers.length }, "Nutrition precompute complete");
      return { cached, totalUsers: activeUsers.length };
    },
    { connection: getQueueConnection(), concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Nutrition precompute job failed");
  });

  return worker;
}
