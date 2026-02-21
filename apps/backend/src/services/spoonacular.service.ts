import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import {
  SPOONACULAR_DAILY_LIMIT,
  SPOONACULAR_DAILY_BUFFER,
} from "../config/constants.js";

interface SpoonacularSearchResult {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  nutrition?: {
    nutrients: { name: string; amount: number; unit: string }[];
  };
}

interface SpoonacularSearchResponse {
  results: SpoonacularSearchResult[];
  offset: number;
  number: number;
  totalResults: number;
}

export interface SpoonacularRecipeDetail {
  id: number;
  title: string;
  image: string | null;
  readyInMinutes: number;
  servings: number;
  nutrition?: {
    nutrients: { name: string; amount: number; unit: string }[];
  };
  extendedIngredients?: {
    name: string;
    amount: number;
    unit: string;
    original: string;
  }[];
  analyzedInstructions?: {
    steps: { number: number; step: string }[];
  }[];
  diets?: string[];
  cuisines?: string[];
}

export interface SpoonacularFoodResult {
  id: number;
  name: string;
  image: string | null;
}

function todayKey(): string {
  const date = new Date().toISOString().split("T")[0];
  return `spoonacular:daily:${date}`;
}

export class SpoonacularService {
  private baseUrl = "https://api.spoonacular.com";
  private effectiveLimit = SPOONACULAR_DAILY_LIMIT - SPOONACULAR_DAILY_BUFFER;

  async checkQuota(): Promise<{ remaining: number; allowed: boolean }> {
    try {
      const used = parseInt((await redis.get(todayKey())) ?? "0", 10);
      const remaining = Math.max(0, this.effectiveLimit - used);
      return { remaining, allowed: remaining > 0 };
    } catch {
      // Fail-open: allow if Redis is down
      return { remaining: this.effectiveLimit, allowed: true };
    }
  }

  private async incrementQuota(cost: number = 1): Promise<void> {
    try {
      const key = todayKey();
      await redis.incrby(key, cost);
      await redis.expire(key, 86400);
    } catch {
      logger.warn("Failed to increment Spoonacular quota counter");
    }
  }

  private async fetchApi<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    url.searchParams.set("apiKey", env.SPOONACULAR_API_KEY);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      if (response.status === 402) {
        throw new AppError(429, "QUOTA_EXCEEDED", "Spoonacular API daily quota exceeded");
      }
      throw new AppError(502, "EXTERNAL_API_ERROR", `Spoonacular API returned ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  async searchRecipes(
    query: string,
    options: { number?: number; diet?: string; intolerances?: string } = {},
  ): Promise<SpoonacularSearchResult[]> {
    const { allowed } = await this.checkQuota();
    if (!allowed) {
      throw new AppError(429, "QUOTA_EXCEEDED", "Spoonacular daily limit reached");
    }

    const params: Record<string, string> = {
      query,
      addRecipeNutrition: "true",
      number: String(options.number ?? 10),
    };
    if (options.diet) params.diet = options.diet;
    if (options.intolerances) params.intolerances = options.intolerances;

    const data = await this.fetchApi<SpoonacularSearchResponse>(
      "/recipes/complexSearch",
      params,
    );

    await this.incrementQuota(1);

    return data.results;
  }

  async getRecipeDetails(spoonacularId: number): Promise<SpoonacularRecipeDetail> {
    const { allowed } = await this.checkQuota();
    if (!allowed) {
      throw new AppError(429, "QUOTA_EXCEEDED", "Spoonacular daily limit reached");
    }

    const data = await this.fetchApi<SpoonacularRecipeDetail>(
      `/recipes/${spoonacularId}/information`,
      { includeNutrition: "true" },
    );

    await this.incrementQuota(1);

    return data;
  }

  async searchFood(query: string, limit: number): Promise<SpoonacularFoodResult[]> {
    const { allowed } = await this.checkQuota();
    if (!allowed) {
      throw new AppError(429, "QUOTA_EXCEEDED", "Spoonacular daily limit reached");
    }

    const data = await this.fetchApi<{ results: SpoonacularFoodResult[] }>(
      "/food/ingredients/search",
      { query, number: String(limit) },
    );

    await this.incrementQuota(1);

    return data.results;
  }
}

export const spoonacularService = new SpoonacularService();
