import type {
  DailyNutritionSummary,
  WeeklyNutritionSummary,
  NutritionSummary,
} from "@snacktrack/shared-types";
import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";
import { CACHE_TTL } from "../config/constants.js";

function emptyNutrition(): NutritionSummary {
  return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
}

function percentage(consumed: number, target: number | null | undefined): number | null {
  if (!target || target === 0) return null;
  return Math.round((consumed / target) * 100);
}

export class NutritionService {
  async getDailySummary(
    userId: string,
    date: string,
  ): Promise<DailyNutritionSummary> {
    // Check Redis cache (populated by nutrition-precompute job)
    const cacheKey = `nutrition:daily:${userId}:${date}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as DailyNutritionSummary;
    } catch {
      // Cache miss or error, compute fresh
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const logs = await prisma.mealLog.findMany({
      where: {
        userId,
        loggedAt: { gte: startOfDay, lt: endOfDay },
      },
    });

    const consumed: NutritionSummary = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories ?? 0) * log.servings,
        proteinG: acc.proteinG + (log.proteinG ?? 0) * log.servings,
        carbsG: acc.carbsG + (log.carbsG ?? 0) * log.servings,
        fatG: acc.fatG + (log.fatG ?? 0) * log.servings,
      }),
      emptyNutrition(),
    );

    // Round to 1 decimal
    consumed.calories = Math.round(consumed.calories * 10) / 10;
    consumed.proteinG = Math.round(consumed.proteinG * 10) / 10;
    consumed.carbsG = Math.round(consumed.carbsG * 10) / 10;
    consumed.fatG = Math.round(consumed.fatG * 10) / 10;

    // Get user targets
    const preferences = await prisma.dietaryPreference.findUnique({
      where: { userId },
    });

    const targets: NutritionSummary | null = preferences
      ? {
          calories: preferences.calorieTarget ?? 0,
          proteinG: preferences.proteinTargetG ?? 0,
          carbsG: preferences.carbTargetG ?? 0,
          fatG: preferences.fatTargetG ?? 0,
        }
      : null;

    const summary: DailyNutritionSummary = {
      date,
      consumed,
      targets,
      mealCount: logs.length,
      percentages: {
        calories: percentage(consumed.calories, targets?.calories),
        protein: percentage(consumed.proteinG, targets?.proteinG),
        carbs: percentage(consumed.carbsG, targets?.carbsG),
        fat: percentage(consumed.fatG, targets?.fatG),
      },
    };

    // Cache the result
    try {
      await redis.setex(cacheKey, CACHE_TTL.NUTRITION, JSON.stringify(summary));
    } catch {
      // Non-critical
    }

    return summary;
  }

  async getWeeklySummary(
    userId: string,
    weekStart: string,
  ): Promise<WeeklyNutritionSummary> {
    const startDate = new Date(weekStart);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    // Build daily breakdowns for all 7 days
    const dailyBreakdown: DailyNutritionSummary[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0]!;
      const summary = await this.getDailySummary(userId, dateStr);
      dailyBreakdown.push(summary);
    }

    // Calculate weekly totals
    const weeklyTotals: NutritionSummary = dailyBreakdown.reduce(
      (acc, day) => ({
        calories: acc.calories + day.consumed.calories,
        proteinG: acc.proteinG + day.consumed.proteinG,
        carbsG: acc.carbsG + day.consumed.carbsG,
        fatG: acc.fatG + day.consumed.fatG,
      }),
      emptyNutrition(),
    );

    // Calculate weekly averages
    const weeklyAverages: NutritionSummary = {
      calories: Math.round((weeklyTotals.calories / 7) * 10) / 10,
      proteinG: Math.round((weeklyTotals.proteinG / 7) * 10) / 10,
      carbsG: Math.round((weeklyTotals.carbsG / 7) * 10) / 10,
      fatG: Math.round((weeklyTotals.fatG / 7) * 10) / 10,
    };

    // Round totals
    weeklyTotals.calories = Math.round(weeklyTotals.calories * 10) / 10;
    weeklyTotals.proteinG = Math.round(weeklyTotals.proteinG * 10) / 10;
    weeklyTotals.carbsG = Math.round(weeklyTotals.carbsG * 10) / 10;
    weeklyTotals.fatG = Math.round(weeklyTotals.fatG * 10) / 10;

    return {
      weekStart,
      weekEnd: endDate.toISOString().split("T")[0]!,
      dailyBreakdown,
      weeklyTotals,
      weeklyAverages,
    };
  }
}

export const nutritionService = new NutritionService();
