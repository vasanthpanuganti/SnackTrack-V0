import { Queue, Worker, type Job } from "bullmq";
import { getQueueConnection } from "../config/queue.js";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { spoonacularService } from "../services/spoonacular.service.js";
import { CACHE_TTL } from "../config/constants.js";

const QUEUE_NAME = "recipe-cache-refresh";

export function createRecipeCacheRefreshQueue(): Queue {
  return new Queue(QUEUE_NAME, {
    connection: getQueueConnection(),
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  });
}

export function createRecipeCacheRefreshWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      logger.info({ jobId: job.id }, "Starting recipe cache refresh");

      const expiringRecipes = await prisma.recipe.findMany({
        where: {
          spoonacularId: { not: null },
          expiresAt: {
            gt: new Date(),
            lt: new Date(Date.now() + 3 * 86400 * 1000),
          },
        },
        take: 20,
        orderBy: { expiresAt: "asc" },
      });

      let refreshed = 0;
      for (const recipe of expiringRecipes) {
        try {
          if (!recipe.spoonacularId) continue;
          const detail = await spoonacularService.getRecipeDetails(recipe.spoonacularId);
          const nutrients = detail.nutrition?.nutrients;

          await prisma.recipe.update({
            where: { id: recipe.id },
            data: {
              title: detail.title,
              imageUrl: detail.image,
              readyInMinutes: detail.readyInMinutes,
              servings: detail.servings,
              calories: nutrients?.find((n) => n.name.toLowerCase().includes("calories"))?.amount ?? recipe.calories,
              proteinG: nutrients?.find((n) => n.name.toLowerCase().includes("protein"))?.amount ?? recipe.proteinG,
              carbsG: nutrients?.find((n) => n.name.toLowerCase().includes("carbohydrates"))?.amount ?? recipe.carbsG,
              fatG: nutrients?.find((n) => n.name.toLowerCase().includes("fat"))?.amount ?? recipe.fatG,
              cachedAt: new Date(),
              expiresAt: new Date(Date.now() + CACHE_TTL.RECIPE_DB_DAYS * 86400 * 1000),
            },
          });
          refreshed++;
        } catch (error) {
          logger.warn({ error, recipeId: recipe.id }, "Failed to refresh recipe");
        }
      }

      logger.info({ refreshed, total: expiringRecipes.length }, "Recipe cache refresh complete");
      return { refreshed, total: expiringRecipes.length };
    },
    { connection: getQueueConnection(), concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Recipe cache refresh job failed");
  });

  return worker;
}
