import type { MealLog } from "@snacktrack/shared-types";
import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

type CreateMealLogInput = {
  recipeId?: string | null;
  mealType: string;
  foodName: string;
  servings?: number;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  loggedAt?: string;
  source?: string;
};

type MealLogQuery = {
  date?: string;
  range?: "day" | "week" | "month";
  cursor?: string;
  limit?: number;
};

function mapMealLog(log: {
  id: string;
  userId: string;
  recipeId: string | null;
  mealType: string;
  foodName: string;
  servings: number;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  loggedAt: Date;
  source: string;
  synced: boolean;
}): MealLog {
  return {
    id: log.id,
    userId: log.userId,
    recipeId: log.recipeId,
    mealType: log.mealType as MealLog["mealType"],
    foodName: log.foodName,
    servings: log.servings,
    calories: log.calories,
    proteinG: log.proteinG,
    carbsG: log.carbsG,
    fatG: log.fatG,
    loggedAt: log.loggedAt.toISOString(),
    source: log.source as MealLog["source"],
    synced: log.synced,
  };
}

function getDateRange(
  date: string | undefined,
  range: "day" | "week" | "month",
): { gte: Date; lt: Date } | undefined {
  if (!date) return undefined;

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  switch (range) {
    case "day":
      end.setDate(end.getDate() + 1);
      break;
    case "week":
      end.setDate(end.getDate() + 7);
      break;
    case "month":
      end.setMonth(end.getMonth() + 1);
      break;
  }

  return { gte: start, lt: end };
}

export class MealLogService {
  async create(userId: string, data: CreateMealLogInput): Promise<MealLog> {
    const log = await prisma.mealLog.create({
      data: {
        userId,
        recipeId: data.recipeId ?? null,
        mealType: data.mealType,
        foodName: data.foodName,
        servings: data.servings ?? 1,
        calories: data.calories ?? null,
        proteinG: data.proteinG ?? null,
        carbsG: data.carbsG ?? null,
        fatG: data.fatG ?? null,
        loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
        source: data.source ?? "manual",
      },
    });

    return mapMealLog(log);
  }

  async list(
    userId: string,
    query: MealLogQuery,
  ): Promise<{ items: MealLog[]; nextCursor: string | null; hasMore: boolean }> {
    const limit = query.limit ?? 20;
    const dateFilter = getDateRange(query.date, query.range ?? "day");

    const logs = await prisma.mealLog.findMany({
      where: {
        userId,
        ...(dateFilter ? { loggedAt: dateFilter } : {}),
      },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { loggedAt: "desc" },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;

    return {
      items: items.map(mapMealLog),
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
      hasMore,
    };
  }

  async delete(userId: string, logId: string): Promise<void> {
    const log = await prisma.mealLog.findUnique({ where: { id: logId } });

    if (!log) {
      throw new AppError(404, "MEAL_LOG_NOT_FOUND", "Meal log not found");
    }

    if (log.userId !== userId) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this meal log");
    }

    await prisma.mealLog.delete({ where: { id: logId } });
  }
}

export const mealLogService = new MealLogService();
