import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/config/database.js", () => ({
  isDatabaseHealthy: vi.fn().mockResolvedValue(true),
  prisma: {
    recipe: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/redis.js", () => ({
  isRedisHealthy: vi.fn().mockResolvedValue(true),
  redis: { on: vi.fn(), get: vi.fn(), setex: vi.fn(), incr: vi.fn(), ttl: vi.fn(), expire: vi.fn() },
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

vi.mock("../../src/services/spoonacular.service.js", () => ({
  spoonacularService: {
    getRecipeDetails: vi.fn(),
  },
}));

// Mock BullMQ to avoid Redis connections in tests
vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    close: vi.fn(),
    getRepeatableJobs: vi.fn().mockResolvedValue([]),
    removeRepeatableByKey: vi.fn(),
  })),
  Worker: vi.fn().mockImplementation((_name: string, processor: Function) => {
    return {
      close: vi.fn(),
      on: vi.fn(),
      _processor: processor,
    };
  }),
}));

import { prisma } from "../../src/config/database.js";
import { spoonacularService } from "../../src/services/spoonacular.service.js";
import {
  createRecipeCacheRefreshQueue,
  createRecipeCacheRefreshWorker,
} from "../../src/jobs/recipe-cache-refresh.job.js";

describe("Recipe Cache Refresh Job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a queue and worker", () => {
    const queue = createRecipeCacheRefreshQueue();
    const worker = createRecipeCacheRefreshWorker();

    expect(queue).toBeDefined();
    expect(worker).toBeDefined();
  });

  it("processes expiring recipes", async () => {
    const expiringRecipe = {
      id: "recipe-1",
      spoonacularId: 123,
      calories: 400,
      proteinG: 30,
      carbsG: 50,
      fatG: 15,
    };

    vi.mocked(prisma.recipe.findMany).mockResolvedValue([expiringRecipe] as never);
    vi.mocked(spoonacularService.getRecipeDetails).mockResolvedValue({
      id: 123,
      title: "Updated Recipe",
      image: "https://example.com/image.jpg",
      readyInMinutes: 30,
      servings: 4,
      nutrition: {
        nutrients: [
          { name: "Calories", amount: 420, unit: "kcal" },
          { name: "Protein", amount: 32, unit: "g" },
          { name: "Carbohydrates", amount: 52, unit: "g" },
          { name: "Fat", amount: 16, unit: "g" },
        ],
      },
      extendedIngredients: [],
      diets: [],
      cuisines: [],
      analyzedInstructions: [],
    } as never);
    vi.mocked(prisma.recipe.update).mockResolvedValue(expiringRecipe as never);

    const worker = createRecipeCacheRefreshWorker();
    // Access the processor function stored by our mock
    const processor = (worker as unknown as { _processor: Function })._processor;
    const result = await processor({ id: "test-job" });

    expect(result).toEqual({ refreshed: 1, total: 1 });
    expect(prisma.recipe.findMany).toHaveBeenCalled();
    expect(spoonacularService.getRecipeDetails).toHaveBeenCalledWith(123);
    expect(prisma.recipe.update).toHaveBeenCalled();
  });

  it("handles empty expiring list", async () => {
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([] as never);

    const worker = createRecipeCacheRefreshWorker();
    const processor = (worker as unknown as { _processor: Function })._processor;
    const result = await processor({ id: "test-job" });

    expect(result).toEqual({ refreshed: 0, total: 0 });
  });
});
