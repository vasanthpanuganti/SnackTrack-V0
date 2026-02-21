"""Knowledge-Based Recommendation System.

Relies on expert-validated nutritional guidelines, user profiles
(age, weight, allergies, goals), and food databases to ensure
recommendations are safe and align with established dietary standards.
Critical for health-related recommendations where safety and efficacy
are paramount.
"""

from psycopg import AsyncConnection

from ..config import settings

# Expert-validated dietary guidelines (based on USDA/WHO standards)
DAILY_REFERENCE_INTAKES = {
    "calories": {"min": 1200, "max": 3500, "default": 2000},
    "protein_g": {"min": 46, "max": 200, "default": 50},
    "carbs_g": {"min": 130, "max": 400, "default": 275},
    "fat_g": {"min": 44, "max": 150, "default": 78},
    "fiber_g": {"min": 25, "max": 50, "default": 28},
    "sodium_mg": {"min": 500, "max": 2300, "default": 2300},
    "sugar_g": {"min": 0, "max": 50, "default": 50},
}

# Meal type calorie distribution guidelines
MEAL_DISTRIBUTION = {
    "breakfast": {"ratio": 0.25, "min_ratio": 0.15, "max_ratio": 0.35},
    "lunch": {"ratio": 0.35, "min_ratio": 0.25, "max_ratio": 0.40},
    "dinner": {"ratio": 0.35, "min_ratio": 0.25, "max_ratio": 0.40},
    "snack": {"ratio": 0.05, "min_ratio": 0.0, "max_ratio": 0.15},
}

# Diet type constraints (allergen and ingredient restrictions)
DIET_CONSTRAINTS: dict[str, dict] = {
    "vegetarian": {
        "excluded_allergens": [],
        "excluded_ingredients": ["meat", "poultry", "fish", "seafood"],
        "preferred_labels": ["vegetarian", "lacto-vegetarian", "ovo-vegetarian"],
    },
    "vegan": {
        "excluded_allergens": ["dairy", "eggs"],
        "excluded_ingredients": ["meat", "poultry", "fish", "seafood", "honey", "gelatin"],
        "preferred_labels": ["vegan"],
    },
    "keto": {
        "excluded_allergens": [],
        "excluded_ingredients": [],
        "preferred_labels": ["ketogenic"],
        "macro_override": {"carbs_g_max": 50, "fat_g_min": 100},
    },
    "mediterranean": {
        "excluded_allergens": [],
        "excluded_ingredients": [],
        "preferred_labels": ["mediterranean"],
        "emphasis": ["olive oil", "fish", "whole grains", "vegetables", "fruits"],
    },
    "paleo": {
        "excluded_allergens": ["dairy", "gluten"],
        "excluded_ingredients": ["grains", "legumes", "refined sugar"],
        "preferred_labels": ["paleo"],
    },
}


class NutritionScore:
    """Scores a recipe based on nutritional guidelines and user goals."""

    def __init__(
        self,
        calorie_target: float = 2000,
        protein_target: float | None = None,
        carb_target: float | None = None,
        fat_target: float | None = None,
        diet_type: str | None = None,
    ):
        self.calorie_target = calorie_target
        self.protein_target = protein_target or DAILY_REFERENCE_INTAKES["protein_g"]["default"]
        self.carb_target = carb_target or DAILY_REFERENCE_INTAKES["carbs_g"]["default"]
        self.fat_target = fat_target or DAILY_REFERENCE_INTAKES["fat_g"]["default"]
        self.diet_type = diet_type
        self.constraints = DIET_CONSTRAINTS.get(diet_type or "", {})

    def score_recipe(
        self,
        recipe: dict,
        meal_type: str = "lunch",
    ) -> float:
        """
        Score a recipe 0.0–1.0 based on nutritional alignment.

        Factors:
        - Calorie appropriateness for the meal type
        - Macro balance (protein, carbs, fat)
        - Diet type compatibility
        - Nutritional density
        """
        scores = []

        # 1. Calorie appropriateness (0.0-1.0)
        meal_ratio = MEAL_DISTRIBUTION.get(meal_type, {"ratio": 0.3})["ratio"]
        target_calories = self.calorie_target * meal_ratio
        recipe_calories = recipe.get("calories") or 0

        if target_calories > 0 and recipe_calories > 0:
            cal_ratio = recipe_calories / target_calories
            # Perfect score at 1.0 ratio, declining linearly
            cal_score = max(0, 1.0 - abs(1.0 - cal_ratio) * 0.5)
            scores.append(("calories", cal_score, 0.3))

        # 2. Macro balance (0.0-1.0)
        macro_score = self._score_macros(recipe, meal_ratio)
        scores.append(("macros", macro_score, 0.25))

        # 3. Diet compatibility (0.0-1.0)
        diet_score = self._score_diet_compatibility(recipe)
        scores.append(("diet", diet_score, 0.25))

        # 4. Nutritional density (0.0-1.0)
        density_score = self._score_nutrient_density(recipe)
        scores.append(("density", density_score, 0.2))

        # Weighted average
        if not scores:
            return 0.5

        total_weight = sum(w for _, _, w in scores)
        weighted_sum = sum(s * w for _, s, w in scores)
        return weighted_sum / total_weight if total_weight > 0 else 0.5

    def _score_macros(self, recipe: dict, meal_ratio: float) -> float:
        """Score macro nutrient balance."""
        protein = recipe.get("protein_g") or 0
        carbs = recipe.get("carbs_g") or 0
        fat = recipe.get("fat_g") or 0

        protein_target = self.protein_target * meal_ratio
        carb_target = self.carb_target * meal_ratio
        fat_target = self.fat_target * meal_ratio

        macro_scores = []
        for actual, target in [
            (protein, protein_target),
            (carbs, carb_target),
            (fat, fat_target),
        ]:
            if target > 0:
                ratio = actual / target
                macro_scores.append(max(0, 1.0 - abs(1.0 - ratio) * 0.5))

        return sum(macro_scores) / len(macro_scores) if macro_scores else 0.5

    def _score_diet_compatibility(self, recipe: dict) -> float:
        """Score compatibility with user's diet type."""
        if not self.diet_type:
            return 1.0

        recipe_allergens = set(a.lower() for a in (recipe.get("allergens") or []))
        recipe_labels = set(l.lower() for l in (recipe.get("diet_labels") or []))

        # Check excluded allergens
        excluded = set(a.lower() for a in self.constraints.get("excluded_allergens", []))
        if recipe_allergens & excluded:
            return 0.0  # Hard disqualification

        # Check preferred labels
        preferred = set(l.lower() for l in self.constraints.get("preferred_labels", []))
        if preferred and recipe_labels & preferred:
            return 1.0
        elif preferred:
            return 0.3  # Not labeled but not necessarily incompatible

        return 0.8

    def _score_nutrient_density(self, recipe: dict) -> float:
        """Score nutritional density (fiber, vitamins per calorie)."""
        calories = recipe.get("calories") or 0
        if calories <= 0:
            return 0.5

        fiber = recipe.get("fiber_g") or 0
        protein = recipe.get("protein_g") or 0

        # Fiber density: grams per 100 cal
        fiber_density = (fiber / calories) * 100
        fiber_score = min(1.0, fiber_density / 3.0)

        # Protein density: grams per 100 cal
        protein_density = (protein / calories) * 100
        protein_score = min(1.0, protein_density / 8.0)

        return (fiber_score + protein_score) / 2


async def get_knowledge_based_recommendations(
    conn: AsyncConnection,
    user_id: str,
    top_n: int = 10,
    exclude_ids: list[str] | None = None,
    meal_type: str = "lunch",
) -> list[dict]:
    """
    Get recommendations based on nutritional guidelines and user profile.

    Fetches user dietary preferences, applies expert nutritional rules,
    and scores recipes based on alignment with health goals.
    """
    # Get user dietary preferences
    result = await conn.execute(
        """
        SELECT calorie_target, protein_target_g, carb_target_g,
               fat_target_g, diet_type
        FROM dietary_preferences
        WHERE user_id = %s
        """,
        (user_id,),
    )
    prefs = await result.fetchone()

    scorer = NutritionScore(
        calorie_target=float(prefs["calorie_target"]) if prefs and prefs["calorie_target"] else 2000,
        protein_target=float(prefs["protein_target_g"]) if prefs and prefs["protein_target_g"] else None,
        carb_target=float(prefs["carb_target_g"]) if prefs and prefs["carb_target_g"] else None,
        fat_target=float(prefs["fat_target_g"]) if prefs and prefs["fat_target_g"] else None,
        diet_type=prefs["diet_type"] if prefs else None,
    )

    # Get user allergens for safety filtering
    result = await conn.execute(
        """
        SELECT allergen_type FROM user_allergens WHERE user_id = %s
        """,
        (user_id,),
    )
    user_allergens = {row["allergen_type"].lower() for row in await result.fetchall()}

    # Fetch candidate recipes
    exclude_clause = ""
    params: list = [top_n * 5]
    if exclude_ids:
        exclude_clause = "WHERE id != ALL(%s)"
        params.insert(0, exclude_ids)

    result = await conn.execute(
        f"""
        SELECT id AS recipe_id, title, calories, protein_g, carbs_g, fat_g,
               sodium_mg, fiber_g, sugar_g, allergens, diet_labels
        FROM recipes
        {exclude_clause}
        ORDER BY cached_at DESC
        LIMIT %s
        """,
        tuple(params),
    )
    candidates = await result.fetchall()

    # Score and filter
    scored_recipes = []
    for recipe in candidates:
        # Safety check: exclude recipes with user allergens
        recipe_allergens = set(a.lower() for a in (recipe.get("allergens") or []))
        if recipe_allergens & user_allergens:
            continue

        score = scorer.score_recipe(recipe, meal_type)
        scored_recipes.append({
            "recipe_id": recipe["recipe_id"],
            "title": recipe["title"],
            "score": score,
            "source": "knowledge",
        })

    # Sort by score and return top N
    scored_recipes.sort(key=lambda x: x["score"], reverse=True)
    return scored_recipes[:top_n]
