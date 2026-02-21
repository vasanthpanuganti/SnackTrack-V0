import type { RecipeRecommendation } from "@snacktrack/shared-types";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

interface MLRecommendResponse {
  user_id: string;
  recommendations: Array<{
    recipe_id: string;
    title: string;
    score: number;
    source: string;
  }>;
  is_cold_start: boolean;
  model_version: string;
}

interface MLTrainResponse {
  user_id: string;
  interaction_count: number;
  is_cold_start: boolean;
  message: string;
}

export class MLServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MLServiceError";
  }
}

export class MLService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.ML_SERVICE_URL;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { status: string };
      return data.status === "healthy";
    } catch {
      return false;
    }
  }

  async getRecommendations(
    userId: string,
    topN: number = 10,
    excludeRecipeIds: string[] = [],
  ): Promise<RecipeRecommendation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          top_n: topN,
          exclude_recipe_ids: excludeRecipeIds,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        logger.warn(
          { status: response.status, userId },
          "ML service recommendation request failed",
        );
        throw new MLServiceError(
          `Recommendation request failed with status ${response.status}`,
        );
      }

      const data = (await response.json()) as MLRecommendResponse;

      return data.recommendations.map((r, i) => ({
        recipeId: r.recipe_id,
        score: r.score,
        contentScore: r.source === "content" ? r.score : null,
        collabScore: r.source === "collaborative" ? r.score : null,
        rank: i + 1,
      }));
    } catch (error) {
      logger.warn({ error, userId }, "ML service unreachable for recommendations");
      if (error instanceof MLServiceError) {
        throw error;
      }
      throw new MLServiceError("ML service unreachable for recommendations");
    }
  }

  async trainUserModel(userId: string): Promise<MLTrainResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        logger.warn(
          { status: response.status, userId },
          "ML service training request failed",
        );
        throw new MLServiceError(
          `Training request failed with status ${response.status}`,
        );
      }

      return (await response.json()) as MLTrainResponse;
    } catch (error) {
      logger.warn({ error, userId }, "ML service unreachable for training");
      if (error instanceof MLServiceError) {
        throw error;
      }
      throw new MLServiceError("ML service unreachable for training");
    }
  }
}

export const mlService = new MLService();
