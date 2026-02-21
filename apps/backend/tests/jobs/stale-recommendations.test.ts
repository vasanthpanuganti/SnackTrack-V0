import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/config/database.js", () => ({
  isDatabaseHealthy: vi.fn().mockResolvedValue(true),
  prisma: {
    recommendationCache: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/redis.js", () => ({
  isRedisHealthy: vi.fn().mockResolvedValue(true),
  redis: { on: vi.fn() },
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
import {
  createStaleRecommendationsQueue,
  createStaleRecommendationsWorker,
} from "../../src/jobs/stale-recommendations.job.js";

describe("Stale Recommendations Job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a queue and worker", () => {
    const queue = createStaleRecommendationsQueue();
    const worker = createStaleRecommendationsWorker();

    expect(queue).toBeDefined();
    expect(worker).toBeDefined();
  });

  it("deletes stale recommendation cache entries", async () => {
    vi.mocked(prisma.recommendationCache.deleteMany).mockResolvedValue({ count: 5 } as never);

    const worker = createStaleRecommendationsWorker();
    const processor = (worker as unknown as { _processor: Function })._processor;
    const result = await processor({ id: "test-job" });

    expect(result).toEqual({ deleted: 5 });
    expect(prisma.recommendationCache.deleteMany).toHaveBeenCalledWith({
      where: { generatedAt: { lt: expect.any(Date) } },
    });
  });

  it("handles zero stale entries", async () => {
    vi.mocked(prisma.recommendationCache.deleteMany).mockResolvedValue({ count: 0 } as never);

    const worker = createStaleRecommendationsWorker();
    const processor = (worker as unknown as { _processor: Function })._processor;
    const result = await processor({ id: "test-job" });

    expect(result).toEqual({ deleted: 0 });
  });
});
