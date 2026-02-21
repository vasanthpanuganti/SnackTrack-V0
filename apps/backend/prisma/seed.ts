import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── User 1: Primary test user ──────────────────────────────────
  const user1 = await prisma.user.upsert({
    where: { email: "test@snacktrack.dev" },
    update: {},
    create: {
      email: "test@snacktrack.dev",
      displayName: "Test User",
      gender: "prefer_not_to_say",
      heightCm: 170,
      weightKg: 70,
      activityLevel: "moderate",
      healthGoal: "wellness",
      unitPreference: "metric",
    },
  });
  console.log(`User 1: ${user1.email} (${user1.id})`);

  // ─── User 2: Secondary test user ───────────────────────────────
  const user2 = await prisma.user.upsert({
    where: { email: "jane@snacktrack.dev" },
    update: {},
    create: {
      email: "jane@snacktrack.dev",
      displayName: "Jane Doe",
      gender: "female",
      heightCm: 163,
      weightKg: 58,
      activityLevel: "active",
      healthGoal: "muscle_gain",
      unitPreference: "imperial",
    },
  });
  console.log(`User 2: ${user2.email} (${user2.id})`);

  // ─── Allergens ──────────────────────────────────────────────────
  const allergenData = [
    { userId: user1.id, allergenType: "peanuts", severity: "severe", isCustom: false },
    { userId: user1.id, allergenType: "shellfish", severity: "moderate", isCustom: false },
    { userId: user2.id, allergenType: "milk", severity: "intolerance", isCustom: false },
  ];

  for (const a of allergenData) {
    await prisma.userAllergen.upsert({
      where: { userId_allergenType: { userId: a.userId, allergenType: a.allergenType } },
      update: {},
      create: a,
    });
  }
  console.log(`Created ${allergenData.length} allergens`);

  // ─── Dietary Preferences ────────────────────────────────────────
  await prisma.dietaryPreference.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      dietType: "mediterranean",
      cuisinePreferences: ["italian", "indian", "mexican"],
      maxPrepTimeMin: 45,
      cookingSkill: "intermediate",
      calorieTarget: 2000,
      proteinTargetG: 100,
      carbTargetG: 250,
      fatTargetG: 67,
    },
  });

  await prisma.dietaryPreference.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      dietType: "keto",
      cuisinePreferences: ["japanese", "mediterranean"],
      maxPrepTimeMin: 30,
      cookingSkill: "advanced",
      calorieTarget: 1800,
      proteinTargetG: 130,
      carbTargetG: 50,
      fatTargetG: 120,
    },
  });
  console.log("Created dietary preferences");

  // ─── Recipes (idempotent via spoonacularId) ─────────────────────
  const recipesData = [
    {
      spoonacularId: 100001,
      title: "Grilled Chicken Salad",
      readyInMinutes: 20,
      servings: 2,
      calories: 350,
      proteinG: 35,
      carbsG: 15,
      fatG: 18,
      sodiumMg: 400,
      fiberG: 5,
      sugarG: 4,
      allergens: [] as string[],
      dietLabels: ["gluten_free"],
      cuisineTypes: ["american"],
      ingredients: [
        { name: "chicken breast", amount: 200, unit: "g", original: "200g chicken breast" },
        { name: "mixed greens", amount: 100, unit: "g", original: "100g mixed greens" },
        { name: "olive oil", amount: 1, unit: "tbsp", original: "1 tbsp olive oil" },
      ],
      instructions: [
        { number: 1, step: "Grill chicken breast for 6-7 minutes per side" },
        { number: 2, step: "Slice and arrange over mixed greens" },
        { number: 3, step: "Drizzle with olive oil and serve" },
      ],
    },
    {
      spoonacularId: 100002,
      title: "Vegetable Pasta Primavera",
      readyInMinutes: 30,
      servings: 4,
      calories: 420,
      proteinG: 14,
      carbsG: 65,
      fatG: 12,
      sodiumMg: 350,
      fiberG: 8,
      sugarG: 6,
      allergens: ["wheat"],
      dietLabels: ["vegetarian"],
      cuisineTypes: ["italian"],
      ingredients: [
        { name: "penne pasta", amount: 300, unit: "g", original: "300g penne pasta" },
        { name: "bell peppers", amount: 2, unit: "whole", original: "2 bell peppers, diced" },
        { name: "zucchini", amount: 1, unit: "whole", original: "1 zucchini, sliced" },
      ],
      instructions: [
        { number: 1, step: "Cook pasta according to package directions" },
        { number: 2, step: "Sauté vegetables in olive oil" },
        { number: 3, step: "Combine pasta with vegetables and season" },
      ],
    },
    {
      spoonacularId: 100003,
      title: "Salmon with Roasted Vegetables",
      readyInMinutes: 35,
      servings: 2,
      calories: 480,
      proteinG: 40,
      carbsG: 20,
      fatG: 28,
      sodiumMg: 300,
      fiberG: 6,
      sugarG: 5,
      allergens: ["fish"],
      dietLabels: ["gluten_free", "keto"],
      cuisineTypes: ["mediterranean"],
      ingredients: [
        { name: "salmon fillet", amount: 250, unit: "g", original: "250g salmon fillet" },
        { name: "broccoli", amount: 150, unit: "g", original: "150g broccoli florets" },
        { name: "sweet potato", amount: 1, unit: "medium", original: "1 medium sweet potato" },
      ],
      instructions: [
        { number: 1, step: "Preheat oven to 200°C" },
        { number: 2, step: "Place salmon and vegetables on baking sheet" },
        { number: 3, step: "Roast for 20-25 minutes" },
      ],
    },
    {
      spoonacularId: 100004,
      title: "Avocado Toast with Eggs",
      readyInMinutes: 10,
      servings: 1,
      calories: 380,
      proteinG: 16,
      carbsG: 30,
      fatG: 22,
      sodiumMg: 280,
      fiberG: 7,
      sugarG: 2,
      allergens: ["wheat", "eggs"],
      dietLabels: ["vegetarian"],
      cuisineTypes: ["american"],
      ingredients: [
        { name: "sourdough bread", amount: 2, unit: "slices", original: "2 slices sourdough" },
        { name: "avocado", amount: 1, unit: "whole", original: "1 ripe avocado" },
        { name: "eggs", amount: 2, unit: "whole", original: "2 eggs" },
      ],
      instructions: [
        { number: 1, step: "Toast the sourdough bread" },
        { number: 2, step: "Mash avocado and spread on toast" },
        { number: 3, step: "Fry or poach eggs and place on top" },
      ],
    },
    {
      spoonacularId: 100005,
      title: "Greek Yogurt Parfait",
      readyInMinutes: 5,
      servings: 1,
      calories: 280,
      proteinG: 20,
      carbsG: 35,
      fatG: 8,
      sodiumMg: 80,
      fiberG: 4,
      sugarG: 18,
      allergens: ["milk"],
      dietLabels: ["vegetarian", "gluten_free"],
      cuisineTypes: ["american"],
      ingredients: [
        { name: "greek yogurt", amount: 200, unit: "g", original: "200g greek yogurt" },
        { name: "granola", amount: 30, unit: "g", original: "30g granola" },
        { name: "mixed berries", amount: 100, unit: "g", original: "100g mixed berries" },
      ],
      instructions: [
        { number: 1, step: "Layer yogurt in a glass or bowl" },
        { number: 2, step: "Add granola and berries in layers" },
        { number: 3, step: "Serve immediately" },
      ],
    },
  ];

  const recipes = [];
  for (const r of recipesData) {
    const recipe = await prisma.recipe.upsert({
      where: { spoonacularId: r.spoonacularId },
      update: {},
      create: r,
    });
    recipes.push(recipe);
  }
  console.log(`Created ${recipes.length} recipes`);

  // ─── Meal Plan for User 1 ──────────────────────────────────────
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  // Delete existing plan items and plan to allow re-seeding
  const existingPlan = await prisma.mealPlan.findFirst({
    where: { userId: user1.id, name: "Seed Week Plan" },
  });
  if (existingPlan) {
    await prisma.mealPlanItem.deleteMany({ where: { planId: existingPlan.id } });
    await prisma.mealPlan.delete({ where: { id: existingPlan.id } });
  }

  const mealPlan = await prisma.mealPlan.create({
    data: {
      userId: user1.id,
      name: "Seed Week Plan",
      startDate,
      endDate,
      status: "active",
      calorieTarget: 2000,
    },
  });

  const mealPlanItems = [
    { planId: mealPlan.id, recipeId: recipes[3]!.id, dayNumber: 1, mealType: "breakfast" },
    { planId: mealPlan.id, recipeId: recipes[0]!.id, dayNumber: 1, mealType: "lunch" },
    { planId: mealPlan.id, recipeId: recipes[2]!.id, dayNumber: 1, mealType: "dinner" },
    { planId: mealPlan.id, recipeId: recipes[4]!.id, dayNumber: 2, mealType: "breakfast" },
    { planId: mealPlan.id, recipeId: recipes[1]!.id, dayNumber: 2, mealType: "lunch" },
    { planId: mealPlan.id, recipeId: recipes[2]!.id, dayNumber: 2, mealType: "dinner" },
  ];

  await prisma.mealPlanItem.createMany({ data: mealPlanItems });
  console.log(`Created meal plan with ${mealPlanItems.length} items`);

  // ─── Meal Logs ──────────────────────────────────────────────────
  const yesterday = new Date(startDate);
  yesterday.setDate(yesterday.getDate() - 1);

  // Clean existing seed logs
  await prisma.mealLog.deleteMany({
    where: { userId: user1.id, source: "manual", foodName: { startsWith: "[seed]" } },
  });

  const mealLogs = [
    {
      userId: user1.id,
      recipeId: recipes[3]!.id,
      mealType: "breakfast",
      foodName: "[seed] Avocado Toast with Eggs",
      servings: 1,
      calories: 380,
      proteinG: 16,
      carbsG: 30,
      fatG: 22,
      loggedAt: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000), // 8 AM
      source: "manual",
    },
    {
      userId: user1.id,
      recipeId: recipes[0]!.id,
      mealType: "lunch",
      foodName: "[seed] Grilled Chicken Salad",
      servings: 1,
      calories: 350,
      proteinG: 35,
      carbsG: 15,
      fatG: 18,
      loggedAt: new Date(yesterday.getTime() + 12 * 60 * 60 * 1000), // 12 PM
      source: "manual",
    },
    {
      userId: user1.id,
      recipeId: recipes[2]!.id,
      mealType: "dinner",
      foodName: "[seed] Salmon with Roasted Vegetables",
      servings: 1,
      calories: 480,
      proteinG: 40,
      carbsG: 20,
      fatG: 28,
      loggedAt: new Date(yesterday.getTime() + 19 * 60 * 60 * 1000), // 7 PM
      source: "manual",
    },
    {
      userId: user1.id,
      recipeId: null,
      mealType: "snack",
      foodName: "[seed] Apple with Almond Butter",
      servings: 1,
      calories: 200,
      proteinG: 5,
      carbsG: 25,
      fatG: 10,
      loggedAt: new Date(yesterday.getTime() + 15 * 60 * 60 * 1000), // 3 PM
      source: "manual",
    },
  ];

  await prisma.mealLog.createMany({ data: mealLogs });
  console.log(`Created ${mealLogs.length} meal logs`);

  // ─── User Interactions ──────────────────────────────────────────
  // Clean existing seed interactions
  await prisma.userInteraction.deleteMany({
    where: { userId: user1.id, context: "seed" },
  });

  const interactions = [
    {
      userId: user1.id,
      recipeId: recipes[0]!.id,
      interactionType: "view",
      interactionValue: 1,
      context: "seed",
    },
    {
      userId: user1.id,
      recipeId: recipes[0]!.id,
      interactionType: "rate",
      interactionValue: 4.5,
      context: "seed",
    },
    {
      userId: user1.id,
      recipeId: recipes[2]!.id,
      interactionType: "cook",
      interactionValue: 1,
      context: "seed",
    },
    {
      userId: user1.id,
      recipeId: recipes[2]!.id,
      interactionType: "rate",
      interactionValue: 5.0,
      context: "seed",
    },
    {
      userId: user1.id,
      recipeId: recipes[1]!.id,
      interactionType: "view",
      interactionValue: 1,
      context: "seed",
    },
    {
      userId: user2.id,
      recipeId: recipes[2]!.id,
      interactionType: "rate",
      interactionValue: 4.0,
      context: "seed",
    },
    {
      userId: user2.id,
      recipeId: recipes[0]!.id,
      interactionType: "cook",
      interactionValue: 1,
      context: "seed",
    },
  ];

  await prisma.userInteraction.createMany({ data: interactions });
  console.log(`Created ${interactions.length} user interactions`);

  // ─── Waitlist ───────────────────────────────────────────────────
  await prisma.waitlist.upsert({
    where: { email: "early@snacktrack.dev" },
    update: {},
    create: {
      email: "early@snacktrack.dev",
      name: "Early Adopter",
      source: "landing_page",
    },
  });
  console.log("Created waitlist entry");

  // ─── User Taste Profile (raw SQL for pgvector table) ────────────
  try {
    await prisma.$executeRaw`
      INSERT INTO user_taste_profiles (user_id, interaction_count, cold_start, content_weight, collab_weight)
      VALUES (${user1.id}::uuid, 5, false, 0.7, 0.3)
      ON CONFLICT (user_id) DO UPDATE SET
        interaction_count = EXCLUDED.interaction_count,
        cold_start = EXCLUDED.cold_start
    `;
    console.log("Created user taste profile");
  } catch {
    console.log("Skipped user_taste_profiles (table may not exist yet)");
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
