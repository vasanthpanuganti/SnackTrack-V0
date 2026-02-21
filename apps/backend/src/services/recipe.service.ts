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

export class RecipeService {
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
      // Personalized path: ask ML for ranked recipe IDs and resolve them to DB recipes.
      const recommendations = await mlService.getRecommendations(userId, limit);
      const rankedIds = recommendations.map((r) => r.recipeId);

      if (rankedIds.length > 0) {
        const rankedSet = new Set(rankedIds);
        const found = await prisma.recipe.findMany({
          where: { id: { in: rankedIds } },
        });

        const byId = new Map(found.map((recipe) => [recipe.id, recipe]));
        const ordered = rankedIds
          .filter((id) => rankedSet.has(id))
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

    // Cache each recipe in PostgreSQL
    const recipes: Recipe[] = [];
    for (const result of results) {
      try {
        const detail = await spoonacularService.getRecipeDetails(result.id);
        const recipeData = mapSpoonacularToRecipeData(detail);
        const dbRecipe = await prisma.recipe.upsert({
          where: { spoonacularId: result.id },
          create: recipeData,
          update: { ...recipeData, cachedAt: new Date() },
        });
        recipes.push(mapPrismaToRecipe(dbRecipe));
      } catch (error) {
        logger.warn({ error, recipeId: result.id }, "Failed to cache recipe");
        // Still include basic info from search result
      }
    }

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
