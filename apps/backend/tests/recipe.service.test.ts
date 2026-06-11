import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config/database.js", () => ({
  prisma: {
    $transaction: vi.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    recipe: {
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
    userAllergen: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../src/config/redis.js", () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
  },
}));

vi.mock("../src/services/spoonacular.service.js", () => ({
  spoonacularService: {
    searchRecipes: vi.fn(),
    getRecipeDetails: vi.fn(),
  },
}));

vi.mock("../src/services/ml.service.js", () => ({
  mlService: {
    getRecommendations: vi.fn(),
  },
}));

vi.mock("../src/config/sentry.js", () => ({
  captureMlFailure: vi.fn(),
}));

vi.mock("../src/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { prisma } from "../src/config/database.js";
import { redis } from "../src/config/redis.js";
import { recipeService } from "../src/services/recipe.service.js";
import { spoonacularService } from "../src/services/spoonacular.service.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

const recipeRow = {
  id: "7d9f1a00-1111-4222-8333-444455556666",
  spoonacularId: 123,
  title: "Safe Noodles",
  imageUrl: null,
  cloudinaryUrl: null,
  readyInMinutes: 20,
  servings: 2,
  calories: 500,
  proteinG: 20,
  carbsG: 70,
  fatG: 10,
  sodiumMg: null,
  fiberG: null,
  sugarG: null,
  ingredients: null,
  allergens: [],
  dietLabels: [],
  cuisineTypes: [],
  instructions: null,
  cachedAt: new Date("2025-06-15T12:00:00Z"),
  expiresAt: null,
};

describe("RecipeService allergen filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expands FDA allergen aliases in the database catalog filter", async () => {
    vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([
      { allergenType: "peanuts" },
    ] as never);
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.recipe.count).mockResolvedValue(0 as never);

    const result = await recipeService.listRecipes(
      { page: 1, limit: 12 },
      USER_ID,
    );

    expect(result).toEqual({ recipes: [], total: 0, page: 1, limit: 12 });
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          NOT: { allergens: { hasSome: ["peanuts", "peanut"] } },
        },
      }),
    );
    expect(prisma.recipe.count).toHaveBeenCalledWith({
      where: {
        NOT: { allergens: { hasSome: ["peanuts", "peanut"] } },
      },
    });
  });

  it("passes mapped user allergens as Spoonacular intolerances", async () => {
    vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([
      { allergenType: "peanuts" },
      { allergenType: "milk" },
    ] as never);
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.setex).mockResolvedValue("OK");
    vi.mocked(spoonacularService.searchRecipes).mockResolvedValue([
      {
        id: 123,
        title: "Safe Noodles",
        image: "https://example.com/noodles.jpg",
        readyInMinutes: 20,
        servings: 2,
      },
    ] as never);
    vi.mocked(spoonacularService.getRecipeDetails).mockResolvedValue({
      id: 123,
      title: "Safe Noodles",
      image: "https://example.com/noodles.jpg",
      readyInMinutes: 20,
      servings: 2,
      nutrition: {
        nutrients: [
          { name: "Calories", amount: 500, unit: "kcal" },
          { name: "Protein", amount: 20, unit: "g" },
          { name: "Carbohydrates", amount: 70, unit: "g" },
          { name: "Fat", amount: 10, unit: "g" },
        ],
      },
      extendedIngredients: [],
      diets: [],
      cuisines: [],
      analyzedInstructions: [],
    } as never);
    vi.mocked(prisma.recipe.upsert).mockResolvedValue(recipeRow as never);

    const result = await recipeService.searchRecipes("noodles", 10, USER_ID);

    expect(spoonacularService.searchRecipes).toHaveBeenCalledWith("noodles", {
      number: 10,
      intolerances: "peanut,dairy",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Safe Noodles");
  });
});
