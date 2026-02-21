import IORedis from "ioredis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// BullMQ requires its own Redis connection (uses blocking commands)
let queueConnection: IORedis.default | null = null;

export function getQueueConnection(): IORedis.default {
  if (!queueConnection) {
    queueConnection = new IORedis.default(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });

    queueConnection.on("error", (err: Error) => {
      logger.error({ err }, "BullMQ Redis connection error");
    });
  }

  return queueConnection;
}

export async function closeQueueConnection(): Promise<void> {
  if (queueConnection) {
    await queueConnection.quit();
    queueConnection = null;
    logger.info("BullMQ Redis connection closed");
  }
}
