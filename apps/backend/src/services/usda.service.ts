import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

interface UsdaNutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface UsdaSearchFood {
  fdcId: number;
  description: string;
  foodNutrients: UsdaNutrient[];
  dataType: string;
}

interface UsdaSearchResponse {
  foods: UsdaSearchFood[];
  totalHits: number;
}

export interface UsdaFoodResult {
  fdcId: number;
  name: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

// Common USDA nutrient IDs
const NUTRIENT_IDS = {
  ENERGY: 1008, // kcal
  PROTEIN: 1003,
  CARBS: 1005,
  FAT: 1004,
} as const;

function extractNutrient(nutrients: UsdaNutrient[], id: number): number | null {
  const nutrient = nutrients.find((n) => n.nutrientId === id);
  return nutrient ? nutrient.value : null;
}

export class UsdaService {
  private baseUrl = "https://api.nal.usda.gov/fdc/v1";

  private async fetchApi<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    url.searchParams.set("api_key", env.USDA_API_KEY);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new AppError(
        502,
        "EXTERNAL_API_ERROR",
        `USDA API returned ${response.status}`,
      );
    }

    return response.json() as Promise<T>;
  }

  async searchFoods(query: string, limit: number): Promise<UsdaFoodResult[]> {
    const data = await this.fetchApi<UsdaSearchResponse>("/foods/search", {
      query,
      pageSize: String(limit),
      dataType: "Survey (FNDDS),SR Legacy",
    });

    return data.foods.map((food) => ({
      fdcId: food.fdcId,
      name: food.description,
      calories: extractNutrient(food.foodNutrients, NUTRIENT_IDS.ENERGY),
      proteinG: extractNutrient(food.foodNutrients, NUTRIENT_IDS.PROTEIN),
      carbsG: extractNutrient(food.foodNutrients, NUTRIENT_IDS.CARBS),
      fatG: extractNutrient(food.foodNutrients, NUTRIENT_IDS.FAT),
    }));
  }
}

export const usdaService = new UsdaService();
