import type { MealPlan, MealPlanItem, Recipe } from "@snacktrack/shared-types";
import { prisma } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { recipeService } from "./recipe.service.js";
import { allergenService } from "./allergen.service.js";
import { mlService } from "./ml.service.js";
import { captureMlFailure } from "../config/sentry.js";

type GenerateInput = {
  type: "daily" | "weekly";
  date?: string;
};

type SwapInput = {
  mealSlot: {
    dayNumber: number;
    mealType: string;
  };
  rejectedRecipeId: string;
};

type UpdateInput = {
  name?: string;
  status?: string;
};

const MEAL_SLOTS = ["breakfast", "lunch", "dinner"] as const;

// Calorie distribution per meal type (approximate percentages)
const CALORIE_SPLIT: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.35,
  snack: 0.05,
};

function mapPlanItem(
  item: {
    id: string;
    dayNumber: number;
    mealType: string;
    servings: number;
    isSwapped: boolean;
    recipe: {
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
    };
  },
): MealPlanItem {
  return {
    id: item.id,
    dayNumber: item.dayNumber,
    mealType: item.mealType as MealPlanItem["mealType"],
    servings: item.servings,
    isSwapped: item.isSwapped,
    recipe: {
      id: item.recipe.id,
      spoonacularId: item.recipe.spoonacularId,
      title: item.recipe.title,
      imageUrl: item.recipe.imageUrl,
      cloudinaryUrl: item.recipe.cloudinaryUrl,
      readyInMinutes: item.recipe.readyInMinutes,
      servings: item.recipe.servings,
      calories: item.recipe.calories,
      proteinG: item.recipe.proteinG,
      carbsG: item.recipe.carbsG,
      fatG: item.recipe.fatG,
      sodiumMg: item.recipe.sodiumMg,
      fiberG: item.recipe.fiberG,
      sugarG: item.recipe.sugarG,
      ingredients: item.recipe.ingredients as Recipe["ingredients"],
      allergens: item.recipe.allergens,
      dietLabels: item.recipe.dietLabels,
      cuisineTypes: item.recipe.cuisineTypes,
      instructions: item.recipe.instructions as Recipe["instructions"],
    },
  };
}

function mapPlan(
  plan: {
    id: string;
    userId: string;
    name: string | null;
    startDate: Date;
    endDate: Date;
    status: string;
    calorieTarget: number | null;
    createdAt: Date;
    updatedAt: Date;
    items?: Array<Parameters<typeof mapPlanItem>[0]>;
  },
): MealPlan {
  return {
    id: plan.id,
    userId: plan.userId,
    name: plan.name,
    startDate: plan.startDate.toISOString().split("T")[0]!,
    endDate: plan.endDate.toISOString().split("T")[0]!,
    status: plan.status as MealPlan["status"],
    calorieTarget: plan.calorieTarget,
    items: plan.items?.map(mapPlanItem) ?? [],
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export class MealPlanService {
  async generate(userId: string, input: GenerateInput): Promise<MealPlan> {
    // Get user preferences and allergens
    const [preferences, userAllergens] = await Promise.all([
      prisma.dietaryPreference.findUnique({ where: { userId } }),
      allergenService.getUserAllergens(userId),
    ]);

    const calorieTarget = preferences?.calorieTarget ?? 2000;
    const days = input.type === "weekly" ? 7 : 1;

    const startDate = input.date ? new Date(input.date) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days - 1);

    // Get recipes from cache, filtering by allergens
    const allRecipes = await recipeService.getCachedRecipes({
      diet: preferences?.dietType ?? undefined,
      maxReadyInMinutes: preferences?.maxPrepTimeMin ?? undefined,
      limit: 50,
    });

    // Filter for allergen safety
    let safeRecipes = allRecipes;
    if (userAllergens.length > 0) {
      const { safe } = await allergenService.filterSafeRecipes(allRecipes, userId);
      safeRecipes = safe;
    }

    if (safeRecipes.length === 0) {
      throw new AppError(
        422,
        "INSUFFICIENT_RECIPES",
        "Not enough safe recipes available to generate a meal plan. Try adjusting your preferences or allergen settings.",
      );
    }

    // ML-first ranking: if the model service is healthy, we prioritize personalized recipes.
    // If it fails, we continue with the general backend strategy below.
    const preferenceRank = new Map<string, number>();
    try {
      const personalized = await mlService.getRecommendations(userId, safeRecipes.length);
      personalized.forEach((rec, index) => {
        preferenceRank.set(rec.recipeId, index);
      });
    } catch (error) {
      captureMlFailure(error, { operation: "meal-plan-generate", userId });
      logger.warn(
        { error, userId },
        "ML ranking unavailable, generating general meal plan",
      );
    }

    // Assign recipes to meal slots
    const usedRecipeIds = new Set<string>();
    const planItems: { dayNumber: number; mealType: string; recipeId: string }[] = [];

    for (let day = 1; day <= days; day++) {
      for (const mealType of MEAL_SLOTS) {
        const targetCalories = calorieTarget * (CALORIE_SPLIT[mealType] ?? 0.3);

        // Find best match:
        // 1) closest to target calories
        // 2) if tied, prefer ML-ranked recipe (when available)
        const candidates = safeRecipes
          .filter((r) => !usedRecipeIds.has(r.id))
          .sort((a, b) => {
            const aDiff = Math.abs((a.calories ?? 0) - targetCalories);
            const bDiff = Math.abs((b.calories ?? 0) - targetCalories);
            if (aDiff !== bDiff) {
              return aDiff - bDiff;
            }

            const aRank = preferenceRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const bRank = preferenceRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            return aRank - bRank;
          });

        // If we run out of unique recipes, allow repeats
        const recipe = candidates[0] ?? safeRecipes[Math.floor(Math.random() * safeRecipes.length)]!;
        usedRecipeIds.add(recipe.id);

        planItems.push({
          dayNumber: day,
          mealType,
          recipeId: recipe.id,
        });
      }
    }

    // Create plan in a transaction
    const plan = await prisma.mealPlan.create({
      data: {
        userId,
        name: `${input.type === "weekly" ? "Weekly" : "Daily"} Plan`,
        startDate,
        endDate,
        status: "active",
        calorieTarget,
        items: {
          create: planItems.map((item) => ({
            recipeId: item.recipeId,
            dayNumber: item.dayNumber,
            mealType: item.mealType,
          })),
        },
      },
      include: {
        items: { include: { recipe: true }, orderBy: [{ dayNumber: "asc" }, { mealType: "asc" }] },
      },
    });

    logger.info(
      { userId, planId: plan.id, days, meals: planItems.length },
      "Meal plan generated",
    );

    return mapPlan(plan);
  }

  async listPlans(
    userId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<{ items: MealPlan[]; nextCursor: string | null; hasMore: boolean }> {
    const plans = await prisma.mealPlan.findMany({
      where: { userId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { recipe: true }, orderBy: [{ dayNumber: "asc" }, { mealType: "asc" }] },
      },
    });

    const hasMore = plans.length > limit;
    const items = hasMore ? plans.slice(0, limit) : plans;

    return {
      items: items.map(mapPlan),
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
      hasMore,
    };
  }

  async getPlan(userId: string, planId: string): Promise<MealPlan> {
    const plan = await prisma.mealPlan.findUnique({
      where: { id: planId },
      include: {
        items: { include: { recipe: true }, orderBy: [{ dayNumber: "asc" }, { mealType: "asc" }] },
      },
    });

    if (!plan) {
      throw new AppError(404, "MEAL_PLAN_NOT_FOUND", "Meal plan not found");
    }

    if (plan.userId !== userId) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this meal plan");
    }

    return mapPlan(plan);
  }

  async swapMeal(
    userId: string,
    planId: string,
    input: SwapInput,
  ): Promise<MealPlanItem> {
    // Verify plan ownership
    const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new AppError(404, "MEAL_PLAN_NOT_FOUND", "Meal plan not found");
    }
    if (plan.userId !== userId) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this meal plan");
    }

    // Find the current item
    const currentItem = await prisma.mealPlanItem.findUnique({
      where: {
        planId_dayNumber_mealType: {
          planId,
          dayNumber: input.mealSlot.dayNumber,
          mealType: input.mealSlot.mealType,
        },
      },
    });

    if (!currentItem) {
      throw new AppError(404, "MEAL_SLOT_NOT_FOUND", "No meal found in the specified slot");
    }

    // Find a replacement recipe
    const existingItemRecipeIds = (
      await prisma.mealPlanItem.findMany({
        where: { planId },
        select: { recipeId: true },
      })
    ).map((i) => i.recipeId);

    const excludeIds = [...existingItemRecipeIds, input.rejectedRecipeId];

    const candidates = await recipeService.getCachedRecipes({
      excludeIds,
      limit: 10,
    });

    // Filter by allergens
    const { safe } = await allergenService.filterSafeRecipes(candidates, userId);

    if (safe.length === 0) {
      throw new AppError(
        422,
        "NO_ALTERNATIVES",
        "No alternative recipes available that match your allergen restrictions",
      );
    }

    const replacement = safe[0]!;

    // Update the meal plan item
    const updated = await prisma.mealPlanItem.update({
      where: { id: currentItem.id },
      data: {
        recipeId: replacement.id,
        isSwapped: true,
        originalRecipeId: currentItem.recipeId,
      },
      include: { recipe: true },
    });

    // Record user interactions
    await prisma.userInteraction.createMany({
      data: [
        {
          userId,
          recipeId: input.rejectedRecipeId,
          interactionType: "swap_reject",
          interactionValue: -1,
          context: `plan:${planId}`,
        },
        {
          userId,
          recipeId: replacement.id,
          interactionType: "swap_accept",
          interactionValue: 1,
          context: `plan:${planId}`,
        },
      ],
    });

    // Re-train asynchronously after user feedback interactions.
    // This is fire-and-forget so swap response latency stays low.
    void mlService.trainUserModel(userId).catch((error) => {
      captureMlFailure(error, { operation: "train-after-swap", userId });
      logger.warn({ error, userId }, "ML training failed after swap interaction");
    });

    return mapPlanItem(updated);
  }

  async updatePlan(
    userId: string,
    planId: string,
    data: UpdateInput,
  ): Promise<MealPlan> {
    const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new AppError(404, "MEAL_PLAN_NOT_FOUND", "Meal plan not found");
    }
    if (plan.userId !== userId) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this meal plan");
    }

    const updated = await prisma.mealPlan.update({
      where: { id: planId },
      data,
      include: {
        items: { include: { recipe: true }, orderBy: [{ dayNumber: "asc" }, { mealType: "asc" }] },
      },
    });

    return mapPlan(updated);
  }

  async deletePlan(userId: string, planId: string): Promise<void> {
    const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new AppError(404, "MEAL_PLAN_NOT_FOUND", "Meal plan not found");
    }
    if (plan.userId !== userId) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this meal plan");
    }

    await prisma.mealPlan.delete({ where: { id: planId } });
  }
}

export const mealPlanService = new MealPlanService();
