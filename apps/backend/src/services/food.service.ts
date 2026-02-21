import type { FoodSearchResult } from "@snacktrack/shared-types";
import { redis } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import { CACHE_TTL } from "../config/constants.js";
import { spoonacularService } from "./spoonacular.service.js";
import { usdaService } from "./usda.service.js";

export class FoodService {
  async search(query: string, limit: number): Promise<FoodSearchResult[]> {
    // Check Redis cache
    const cacheKey = `food:search:${Buffer.from(query).toString("base64url")}:${limit}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as FoodSearchResult[];
    } catch {
      // Cache miss
    }

    // Fetch from both APIs in parallel
    const [spoonacularResult, usdaResult] = await Promise.allSettled([
      spoonacularService.searchFood(query, limit),
      usdaService.searchFoods(query, limit),
    ]);

    const results: FoodSearchResult[] = [];
    const seenNames = new Set<string>();

    // Add Spoonacular results
    if (spoonacularResult.status === "fulfilled") {
      for (const item of spoonacularResult.value) {
        const key = item.name.toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          results.push({
            id: `spoonacular:${item.id}`,
            name: item.name,
            source: "spoonacular",
            sourceId: item.id,
            calories: null,
            proteinG: null,
            carbsG: null,
            fatG: null,
            imageUrl: item.image
              ? `https://img.spoonacular.com/ingredients_100x100/${item.image}`
              : null,
          });
        }
      }
    } else {
      logger.warn(
        { error: spoonacularResult.reason },
        "Spoonacular food search failed",
      );
    }

    // Add USDA results
    if (usdaResult.status === "fulfilled") {
      for (const item of usdaResult.value) {
        const key = item.name.toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          results.push({
            id: `usda:${item.fdcId}`,
            name: item.name,
            source: "usda",
            sourceId: item.fdcId,
            calories: item.calories,
            proteinG: item.proteinG,
            carbsG: item.carbsG,
            fatG: item.fatG,
            imageUrl: null,
          });
        }
      }
    } else {
      logger.warn({ error: usdaResult.reason }, "USDA food search failed");
    }

    // Trim to requested limit
    const trimmed = results.slice(0, limit);

    // Cache results in Redis
    try {
      await redis.setex(cacheKey, CACHE_TTL.FOOD_SEARCH, JSON.stringify(trimmed));
    } catch {
      logger.warn("Failed to cache food search results");
    }

    return trimmed;
  }
}

export const foodService = new FoodService();
