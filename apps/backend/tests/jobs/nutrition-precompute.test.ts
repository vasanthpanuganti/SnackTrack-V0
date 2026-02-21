import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/config/database.js", () => ({
  isDatabaseHealthy: vi.fn().mockResolvedValue(true),
  prisma: {
    mealLog: {
      findMany: vi.fn(),
    },
    dietaryPreference: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/redis.js", () => ({
  isRedisHealthy: vi.fn().mockResolvedValue(true),
  redis: { on: vi.fn(), get: vi.fn(), setex: vi.fn() },
}));

vi.mock("../../src/config/supabase.js", () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), admin: { deleteUser: vi.fn() } },
  },
  createUserClient: vi.fn(),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../../src/config/queue.js", () => ({
  getQueueConnection: vi.fn().mockReturnValue({
    on: vi.fn(),
    duplicate: vi.fn().mockReturnValue({ on: vi.fn() }),
  }),
  closeQueueConnection: vi.fn(),
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    close: vi.fn(),
  })),
  Worker: vi.fn().mockImplementation((_name: string, processor: Function) => ({
    close: vi.fn(),
    on: vi.fn(),
    _processor: processor,
  })),
}));

import { prisma } from "../../src/config/database.js";
import { redis } from "../../src/config/redis.js";
import {
  createNutritionPrecomputeQueue,
  createNutritionPrecomputeWorker,
} from "../../src/jobs/nutrition-precompute.job.js";

describe("Nutrition Precompute Job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.get).mockResolvedValue(null);
  });

  it("creates a queue and worker", () => {
    const queue = createNutritionPrecomputeQueue();
    const worker = createNutritionPrecomputeWorker();

    expect(queue).toBeDefined();
    expect(worker).toBeDefined();
  });

  it("precomputes nutrition for active users", async () => {
    const userId = "user-001";
    // First findMany returns active users (distinct userIds)
    vi.mocked(prisma.mealLog.findMany)
      .mockResolvedValueOnce([{ userId }] as never)  // distinct active users
      .mockResolvedValueOnce([] as never);             // meal logs for getDailySummary

    vi.mocked(prisma.dietaryPreference.findUnique).mockResolvedValue(null);
    vi.mocked(redis.setex).mockResolvedValue("OK" as never);

    const worker = createNutritionPrecomputeWorker();
    const processor = (worker as unknown as { _processor: Function })._processor;
    const result = await processor({ id: "test-job" });

    expect(result.totalUsers).toBe(1);
    expect(result.cached).toBe(1);
    expect(redis.setex).toHaveBeenCalled();
  });

  it("handles no active users", async () => {
    vi.mocked(prisma.mealLog.findMany).mockResolvedValue([] as never);

    const worker = createNutritionPrecomputeWorker();
    const processor = (worker as unknown as { _processor: Function })._processor;
    const result = await processor({ id: "test-job" });

    expect(result).toEqual({ cached: 0, totalUsers: 0 });
  });
});
