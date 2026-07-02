import type { Recipe } from "@snacktrack/shared-types";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL } from "../config/constants.js";
import {
  spoonacularService,
  type SpoonacularRecipeDetail,
} from "./spoonacular.service.js";
import { allergenService } from "./allergen.service.js";
import { mlService } from "./ml.service.js";
import { captureMlFailure } from "../config/sentry.js";

// Prisma requires Prisma.JsonNull instead of null for nullable JSON fields
function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

function nutrientValue(
  nutrients: { name: string; amount: number }[] | undefined,
  name: string,
): number | null {
  if (!nutrients) return null;
  const n = nutrients.find((x) => x.name.toLowerCase().includes(name.toLowerCase()));
  return n ? n.amount : null;
}

function mapSpoonacularToRecipeData(detail: SpoonacularRecipeDetail) {
  const nutrients = detail.nutrition?.nutrients;
  return {
    spoonacularId: detail.id,
    title: detail.title,
    imageUrl: detail.image,
    readyInMinutes: detail.readyInMinutes,
    servings: detail.servings,
    calories: nutrientValue(nutrients, "Calories"),
    proteinG: nutrientValue(nutrients, "Protein"),
    carbsG: nutrientValue(nutrients, "Carbohydrates"),
    fatG: nutrientValue(nutrients, "Fat"),
    sodiumMg: nutrientValue(nutrients, "Sodium"),
    fiberG: nutrientValue(nutrients, "Fiber"),
    sugarG: nutrientValue(nutrients, "Sugar"),
    ingredients: jsonOrNull(detail.extendedIngredients?.map((i) => ({
      name: i.name,
      amount: i.amount,
      unit: i.unit,
      original: i.original,
    })) ?? null),
    allergens: [] as string[],
    dietLabels: detail.diets ?? [],
    cuisineTypes: detail.cuisines ?? [],
    instructions: jsonOrNull(detail.analyzedInstructions?.[0]?.steps?.map((s) => ({
      number: s.number,
      step: s.step,
    })) ?? null),
    expiresAt: new Date(Date.now() + CACHE_TTL.RECIPE_DB_DAYS * 86400 * 1000),
  };
}

function mapPrismaToRecipe(r: {
  id: string;
  spoonacularId: number | null;
  title: string;
  imageUrl: string | null;
  cloudinaryUrl: string | null;
  readyInMinutes: number | null;
  servings: number | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  sodiumMg: number | null;
  fiberG: number | null;
  sugarG: number | null;
  ingredients: unknown;
  allergens: string[];
  dietLabels: string[];
  cuisineTypes: string[];
  instructions: unknown;
}): Recipe {
  return {
    id: r.id,
    spoonacularId: r.spoonacularId,
    title: r.title,
    imageUrl: r.imageUrl,
    cloudinaryUrl: r.cloudinaryUrl,
    readyInMinutes: r.readyInMinutes,
    servings: r.servings,
    calories: r.calories,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
    sodiumMg: r.sodiumMg,
    fiberG: r.fiberG,
    sugarG: r.sugarG,
    ingredients: r.ingredients as Recipe["ingredients"],
    allergens: r.allergens,
    dietLabels: r.dietLabels,
    cuisineTypes: r.cuisineTypes,
    instructions: r.instructions as Recipe["instructions"],
  };
}

// Recommendation cache: ranked IDs per user (one key → trivial invalidation),
// plus a short negative cache so an ML outage degrades instantly instead of
// stalling every request on the fetch timeout.
const RECS_CACHE_TTL = 300; // 5 min
const RECS_ML_DOWN_TTL = 30; // seconds
const RECS_FETCH_COUNT = 50; // rank once, slice per request

export function recsCacheKey(userId: string): string {
  return `recs:ml:v1:${userId}`;
}

export class RecipeService {
  /** Ranked recipe IDs for a user — Redis-cached, ML-backed. */
  private async getRankedRecipeIds(userId: string): Promise<string[]> {
    const cacheKey = recsCacheKey(userId);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as string[];
    } catch {
      // Cache unavailable — fall through to ML
    }

    try {
      const mlDown = await redis.get("recs:ml:down");
      if (mlDown) return [];
    } catch {
      // Redis down — just try ML
    }

    const recommendations = await mlService
      .getRecommendations(userId, RECS_FETCH_COUNT)
      .catch(async (error) => {
        // Remember the outage briefly so subsequent requests skip the
        // timeout and fall back immediately.
        try {
          await redis.setex("recs:ml:down", RECS_ML_DOWN_TTL, "1");
        } catch {
          // Non-critical
        }
        throw error;
      });

    const rankedIds = recommendations.map((r) => r.recipeId);
    try {
      await redis.setex(cacheKey, RECS_CACHE_TTL, JSON.stringify(rankedIds));
    } catch {
      // Non-critical
    }
    return rankedIds;
  }

  async getRecommendationsForUser(
    userId: string,
    limit: number,
  ): Promise<{
    recipes: Recipe[];
    total: number;
    page: number;
    limit: number;
    recommendationMode: "personalized" | "general";
  }> {
    try {
      // Personalized path: ranked IDs (cached) resolved to DB recipes.
      const rankedIds = await this.getRankedRecipeIds(userId);

      if (rankedIds.length > 0) {
        // Resolve a small buffer beyond `limit` so a few stale IDs (recipes
        // expired from the catalog) don't shrink the page.
        const windowIds = rankedIds.slice(0, Math.min(rankedIds.length, limit * 2));
        const found = await prisma.recipe.findMany({
          where: { id: { in: windowIds } },
        });

        const byId = new Map(found.map((recipe) => [recipe.id, recipe]));
        const ordered = windowIds
          .map((id) => byId.get(id))
          .filter((recipe): recipe is NonNullable<typeof recipe> => Boolean(recipe))
          .map(mapPrismaToRecipe);

        if (ordered.length > 0) {
          return {
            recipes: ordered.slice(0, limit),
            total: ordered.length,
            page: 1,
            limit,
            recommendationMode: "personalized",
          };
        }
      }
    } catch (error) {
      // We explicitly capture ML failures so alerts show up in Sentry.
      captureMlFailure(error, {
        operation: "recommendations",
        userId,
      });
      logger.warn(
        { error, userId },
        "ML recommendations unavailable, falling back to general recommendations",
      );
    }

    // Fallback path: return general recipes from backend cache when ML is unavailable.
    const fallbackRecipes = await this.getCachedRecipes({ limit });
    return {
      recipes: fallbackRecipes,
      total: fallbackRecipes.length,
      page: 1,
      limit,
      recommendationMode: "general",
    };
  }

  /**
   * Browse/search the recipe catalog with offset pagination.
   *
   * With a search term we try Spoonacular first (results are cached into
   * Postgres), and degrade gracefully to a local title search when the
   * external API is unavailable or over quota. Without a search term this
   * is a pure local catalog query.
   */
  async listRecipes(
    options: {
      search?: string;
      diet?: string;
      maxReadyTime?: number;
      page: number;
      limit: number;
    },
    userId?: string,
  ): Promise<{ recipes: Recipe[]; total: number; page: number; limit: number }> {
    const { search, diet, maxReadyTime, page, limit } = options;

    if (search) {
      try {
        const found = await this.searchRecipes(search, Math.min(limit * 2, 24), userId);
        const start = (page - 1) * limit;
        return {
          recipes: found.slice(start, start + limit),
          total: found.length,
          page,
          limit,
        };
      } catch (error) {
        logger.warn(
          { error, search },
          "External recipe search unavailable, falling back to local catalog",
        );
      }
    }

    const where: Prisma.RecipeWhereInput = {};
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }
    if (diet) {
      where.dietLabels = { has: diet };
    }
    if (maxReadyTime) {
      where.readyInMinutes = { lte: maxReadyTime };
    }

    // Allergen exclusion happens in the query itself so that page size and
    // total stay exact. Filtering after pagination would shrink pages and
    // report a total that includes recipes the user can never see.
    if (userId) {
      const userAllergens = await allergenService.getUserAllergens(userId);
      if (userAllergens.length > 0) {
        where.NOT = { allergens: { hasSome: userAllergens } };
      }
    }

    const [rows, total] = await prisma.$transaction([
      prisma.recipe.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { cachedAt: "desc" },
      }),
      prisma.recipe.count({ where }),
    ]);

    return { recipes: rows.map(mapPrismaToRecipe), total, page, limit };
  }

  async searchRecipes(
    query: string,
    limit: number,
    userId?: string,
  ): Promise<Recipe[]> {
    // Check Redis cache
    const cacheKey = `food:search:${Buffer.from(`${query}:${limit}`).toString("base64url")}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const recipes = JSON.parse(cached) as Recipe[];
        if (userId) {
          const { safe } = await allergenService.filterSafeRecipes(recipes, userId);
          return safe;
        }
        return recipes;
      }
    } catch {
      // Cache miss or error, continue
    }

    // Fetch from Spoonacular
    const results = await spoonacularService.searchRecipes(query, { number: limit });

    // Hydrate details and cache in PostgreSQL concurrently; one slow or
    // failing recipe must not serialize or sink the whole search.
    const settled = await Promise.allSettled(
      results.map(async (result) => {
        const detail = await spoonacularService.getRecipeDetails(result.id);
        const recipeData = mapSpoonacularToRecipeData(detail);
        const dbRecipe = await prisma.recipe.upsert({
          where: { spoonacularId: result.id },
          create: recipeData,
          update: { ...recipeData, cachedAt: new Date() },
        });
        return mapPrismaToRecipe(dbRecipe);
      }),
    );

    const recipes: Recipe[] = [];
    settled.forEach((outcome, i) => {
      if (outcome.status === "fulfilled") {
        recipes.push(outcome.value);
      } else {
        logger.warn(
          { error: outcome.reason, recipeId: results[i]?.id },
          "Failed to cache recipe",
        );
      }
    });

    // Cache search results in Redis
    try {
      await redis.setex(cacheKey, CACHE_TTL.FOOD_SEARCH, JSON.stringify(recipes));
    } catch {
      logger.warn("Failed to cache search results in Redis");
    }

    // Filter for allergen safety if user is authenticated
    if (userId) {
      const { safe } = await allergenService.filterSafeRecipes(recipes, userId);
      return safe;
    }

    return recipes;
  }

  async getRecipeById(id: string): Promise<Recipe> {
    // Check Redis cache
    const cacheKey = `recipe:detail:${id}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as Recipe;
    } catch {
      // Cache miss
    }

    // Check PostgreSQL
    const dbRecipe = await prisma.recipe.findUnique({ where: { id } });

    if (!dbRecipe) {
      throw new AppError(404, "RECIPE_NOT_FOUND", "Recipe not found");
    }

    // If expired and has spoonacularId, refresh from API
    if (
      dbRecipe.expiresAt &&
      dbRecipe.expiresAt < new Date() &&
      dbRecipe.spoonacularId
    ) {
      try {
        const detail = await spoonacularService.getRecipeDetails(
          dbRecipe.spoonacularId,
        );
        const recipeData = mapSpoonacularToRecipeData(detail);
        const updated = await prisma.recipe.update({
          where: { id },
          data: { ...recipeData, cachedAt: new Date() },
        });
        const recipe = mapPrismaToRecipe(updated);

        try {
          await redis.setex(cacheKey, CACHE_TTL.RECIPE_DETAIL, JSON.stringify(recipe));
        } catch {
          // Non-critical
        }

        return recipe;
      } catch (error) {
        logger.warn({ error, id }, "Failed to refresh recipe, returning stale data");
      }
    }

    const recipe = mapPrismaToRecipe(dbRecipe);

    // Cache in Redis
    try {
      await redis.setex(cacheKey, CACHE_TTL.RECIPE_DETAIL, JSON.stringify(recipe));
    } catch {
      // Non-critical
    }

    return recipe;
  }

  async getCachedRecipes(options: {
    diet?: string;
    maxReadyInMinutes?: number;
    limit?: number;
    excludeIds?: string[];
  } = {}): Promise<Recipe[]> {
    const where: Record<string, unknown> = {};

    if (options.diet) {
      where.dietLabels = { has: options.diet };
    }
    if (options.maxReadyInMinutes) {
      where.readyInMinutes = { lte: options.maxReadyInMinutes };
    }
    if (options.excludeIds && options.excludeIds.length > 0) {
      where.id = { notIn: options.excludeIds };
    }

    const recipes = await prisma.recipe.findMany({
      where,
      take: options.limit ?? 20,
      orderBy: { cachedAt: "desc" },
    });

    return recipes.map(mapPrismaToRecipe);
  }
}

export const recipeService = new RecipeService();
