import { prisma } from "../config/database.js";

interface AllergenCheckResult {
  safe: boolean;
  conflicts: string[];
}

interface HasAllergens {
  allergens: string[];
}

export class AllergenService {
  async getUserAllergens(userId: string): Promise<string[]> {
    const allergens = await prisma.userAllergen.findMany({
      where: { userId },
      select: { allergenType: true },
    });
    return allergens.map((a) => a.allergenType.toLowerCase());
  }

  isRecipeSafe(recipeAllergens: string[], userAllergens: string[]): AllergenCheckResult {
    const normalizedRecipe = recipeAllergens.map((a) => a.toLowerCase());
    const normalizedUser = userAllergens.map((a) => a.toLowerCase());

    const conflicts = normalizedRecipe.filter((allergen) =>
      normalizedUser.some(
        (userAllergen) =>
          allergen === userAllergen ||
          allergen.includes(userAllergen) ||
          userAllergen.includes(allergen),
      ),
    );

    return {
      safe: conflicts.length === 0,
      conflicts: [...new Set(conflicts)],
    };
  }

  async filterSafeRecipes<T extends HasAllergens>(
    recipes: T[],
    userId: string,
  ): Promise<{
    safe: T[];
    unsafe: { recipe: T; conflicts: string[] }[];
  }> {
    const userAllergens = await this.getUserAllergens(userId);

    if (userAllergens.length === 0) {
      return { safe: recipes, unsafe: [] };
    }

    const safe: T[] = [];
    const unsafe: { recipe: T; conflicts: string[] }[] = [];

    for (const recipe of recipes) {
      const result = this.isRecipeSafe(recipe.allergens, userAllergens);
      if (result.safe) {
        safe.push(recipe);
      } else {
        unsafe.push({ recipe, conflicts: result.conflicts });
      }
    }

    return { safe, unsafe };
  }
}

export const allergenService = new AllergenService();
