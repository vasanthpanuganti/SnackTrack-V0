import { Prisma } from "@prisma/client";
import type {
  UserProfile,
  User,
  UserAllergen,
  DietaryPreference,
} from "@snacktrack/shared-types";
import { prisma } from "../config/database.js";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

type UpdateProfileInput = {
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: string;
  healthGoal?: string;
  unitPreference?: string;
};

type AllergenInput = {
  allergenType: string;
  severity?: string;
  isCustom?: boolean;
};

type UpdatePreferencesInput = {
  dietType?: string | null;
  cuisinePreferences?: string[];
  maxPrepTimeMin?: number | null;
  cookingSkill?: string | null;
  calorieTarget?: number | null;
  proteinTargetG?: number | null;
  carbTargetG?: number | null;
  fatTargetG?: number | null;
};

function mapUser(user: Prisma.UserGetPayload<object>): User {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    dateOfBirth: user.dateOfBirth?.toISOString().split("T")[0] ?? null,
    gender: user.gender as User["gender"],
    heightCm: user.heightCm,
    weightKg: user.weightKg,
    activityLevel: user.activityLevel as User["activityLevel"],
    healthGoal: user.healthGoal as User["healthGoal"],
    unitPreference: user.unitPreference as User["unitPreference"],
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function mapAllergen(a: Prisma.UserAllergenGetPayload<object>): UserAllergen {
  return {
    id: a.id,
    allergenType: a.allergenType,
    severity: a.severity as UserAllergen["severity"],
    isCustom: a.isCustom,
    createdAt: a.createdAt.toISOString(),
  };
}

function mapPreference(
  p: Prisma.DietaryPreferenceGetPayload<object>,
): DietaryPreference {
  return {
    id: p.id,
    dietType: p.dietType as DietaryPreference["dietType"],
    cuisinePreferences: p.cuisinePreferences,
    maxPrepTimeMin: p.maxPrepTimeMin,
    cookingSkill: p.cookingSkill as DietaryPreference["cookingSkill"],
    calorieTarget: p.calorieTarget,
    proteinTargetG: p.proteinTargetG,
    carbTargetG: p.carbTargetG,
    fatTargetG: p.fatTargetG,
    updatedAt: p.updatedAt.toISOString(),
  };
}

export class UserService {
  async getFullProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { allergens: true, preferences: true },
    });

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    return {
      ...mapUser(user),
      allergens: user.allergens.map(mapAllergen),
      preferences: user.preferences ? mapPreference(user.preferences) : null,
    };
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<User> {
    try {
      const updateData: Prisma.UserUpdateInput = { ...data };

      // Convert dateOfBirth string to Date if provided
      if (data.dateOfBirth) {
        updateData.dateOfBirth = new Date(data.dateOfBirth);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      return mapUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found");
      }
      throw error;
    }
  }

  async replaceAllergens(
    userId: string,
    allergens: AllergenInput[],
  ): Promise<UserAllergen[]> {
    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.userAllergen.deleteMany({ where: { userId } });

      if (allergens.length > 0) {
        await tx.userAllergen.createMany({
          data: allergens.map((a) => ({
            userId,
            allergenType: a.allergenType,
            severity: a.severity ?? "severe",
            isCustom: a.isCustom ?? false,
          })),
        });
      }

      return tx.userAllergen.findMany({ where: { userId } });
    });

    return result.map(mapAllergen);
  }

  async upsertPreferences(
    userId: string,
    data: UpdatePreferencesInput,
  ): Promise<DietaryPreference> {
    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const preference = await prisma.dietaryPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return mapPreference(preference);
  }

  async deleteAccount(userId: string): Promise<void> {
    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    // Delete from database (cascades all related records)
    await prisma.user.delete({ where: { id: userId } });

    // Remove from Supabase Auth
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (error) {
      // Log but don't fail -- DB record is already deleted
      logger.warn({ error, userId }, "Failed to delete user from Supabase Auth");
    }
  }
}

export const userService = new UserService();
