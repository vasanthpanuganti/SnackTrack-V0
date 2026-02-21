"""Content-based recommender using pgvector cosine similarity."""

import numpy as np
from psycopg import AsyncConnection

from ..config import settings


async def get_content_recommendations(
    conn: AsyncConnection,
    user_id: str,
    top_n: int = 10,
    exclude_ids: list[str] | None = None,
) -> list[dict]:
    """
    Get recommendations based on user taste profile vector similarity.

    Uses pgvector's cosine distance operator (<=>) to find recipes
    whose ingredient/nutrition vectors are closest to the user's
    preference vector.
    """
    # Get user taste profile
    result = await conn.execute(
        """
        SELECT preference_vector, interaction_count
        FROM user_taste_profiles
        WHERE user_id = %s
        """,
        (user_id,),
    )
    profile = await result.fetchone()

    if not profile or profile["preference_vector"] is None:
        return []

    preference_vector = np.array(profile["preference_vector"])

    # Build exclusion clause
    exclude_clause = ""
    params: list = [preference_vector.tolist(), top_n * 2]
    if exclude_ids:
        exclude_clause = "AND r.id != ALL(%s)"
        params.insert(1, exclude_ids)

    # Query recipes by cosine similarity to preference vector
    query = f"""
        SELECT
            r.id AS recipe_id,
            r.title,
            1 - (r.ingredient_vector <=> %s::vector) AS similarity_score
        FROM recipes r
        WHERE r.ingredient_vector IS NOT NULL
        {exclude_clause}
        ORDER BY r.ingredient_vector <=> %s::vector ASC
        LIMIT %s
    """

    # Re-add vector for the ORDER BY clause
    params.append(preference_vector.tolist())
    params.append(top_n * 2)

    result = await conn.execute(query, tuple(params))
    rows = await result.fetchall()

    # Also factor in nutrition vector similarity
    nutrition_recs = await _get_nutrition_similarity(
        conn, preference_vector, exclude_ids, top_n
    )

    # Blend ingredient and nutrition scores
    recipe_scores: dict[str, dict] = {}
    for row in rows:
        recipe_scores[row["recipe_id"]] = {
            "recipe_id": row["recipe_id"],
            "title": row["title"],
            "score": float(row["similarity_score"]) * 0.7,
            "source": "content",
        }

    for row in nutrition_recs:
        rid = row["recipe_id"]
        if rid in recipe_scores:
            recipe_scores[rid]["score"] += float(row["similarity_score"]) * 0.3
        else:
            recipe_scores[rid] = {
                "recipe_id": rid,
                "title": row["title"],
                "score": float(row["similarity_score"]) * 0.3,
                "source": "content",
            }

    # Sort and return top N
    sorted_recs = sorted(recipe_scores.values(), key=lambda x: x["score"], reverse=True)
    return sorted_recs[:top_n]


async def _get_nutrition_similarity(
    conn: AsyncConnection,
    preference_vector: np.ndarray,
    exclude_ids: list[str] | None,
    top_n: int,
) -> list[dict]:
    """Get recipes similar by nutrition vector."""
    exclude_clause = ""
    params: list = [preference_vector.tolist(), top_n]
    if exclude_ids:
        exclude_clause = "AND r.id != ALL(%s)"
        params.insert(1, exclude_ids)

    query = f"""
        SELECT
            r.id AS recipe_id,
            r.title,
            1 - (r.nutrition_vector <=> %s::vector) AS similarity_score
        FROM recipes r
        WHERE r.nutrition_vector IS NOT NULL
        {exclude_clause}
        ORDER BY r.nutrition_vector <=> %s::vector ASC
        LIMIT %s
    """
    params.append(preference_vector.tolist())
    params.append(top_n)

    result = await conn.execute(query, tuple(params))
    return await result.fetchall()
