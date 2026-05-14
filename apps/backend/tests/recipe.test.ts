import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../src/config/database.js", () => ({
  isDatabaseHealthy: vi.fn().mockResolvedValue(true),
  prisma: {},
}));

vi.mock("../src/config/redis.js", () => ({
  isRedisHealthy: vi.fn().mockResolvedValue(true),
  redis: { on: vi.fn() },
}));

vi.mock("../src/config/supabase.js", () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
      admin: { deleteUser: vi.fn() },
    },
  },
  createUserClient: vi.fn(),
}));

vi.mock("../src/services/recipe.service.js", () => ({
  recipeService: {
    getCachedRecipes: vi.fn(),
    searchRecipes: vi.fn(),
    getRecommendationsForUser: vi.fn(),
    getRecipeById: vi.fn(),
  },
}));

vi.mock("../src/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { createApp } from "../src/app.js";
import { recipeService } from "../src/services/recipe.service.js";

const app = createApp();

const mockRecipe = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  spoonacularId: 123,
  title: "Chickpea Salad",
  imageUrl: null,
  cloudinaryUrl: null,
  readyInMinutes: 15,
  servings: 2,
  calories: 320,
  proteinG: 12,
  carbsG: 40,
  fatG: 8,
  sodiumMg: null,
  fiberG: null,
  sugarG: null,
  ingredients: null,
  allergens: [],
  dietLabels: ["vegetarian"],
  cuisineTypes: [],
  instructions: null,
};

describe("Recipe endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists cached recipes from GET /api/v1/recipes", async () => {
    vi.mocked(recipeService.getCachedRecipes).mockResolvedValue([mockRecipe]);

    const res = await request(app).get("/api/v1/recipes?limit=12");

    expect(res.status).toBe(200);
    expect(res.body.data.recipes).toHaveLength(1);
    expect(res.body.data.recipes[0].title).toBe("Chickpea Salad");
    expect(recipeService.getCachedRecipes).toHaveBeenCalledWith({
      diet: undefined,
      maxReadyInMinutes: undefined,
      limit: 12,
    });
  });

  it("routes recipe search before the UUID detail route", async () => {
    vi.mocked(recipeService.searchRecipes).mockResolvedValue([mockRecipe]);

    const res = await request(app).get("/api/v1/recipes/search?q=salad&limit=5");

    expect(res.status).toBe(200);
    expect(res.body.data.recipes).toHaveLength(1);
    expect(recipeService.searchRecipes).toHaveBeenCalledWith("salad", 5, undefined);
    expect(recipeService.getRecipeById).not.toHaveBeenCalled();
  });
});
