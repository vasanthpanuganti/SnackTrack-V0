"""Collaborative filtering using user-recipe interaction patterns."""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from psycopg import AsyncConnection

from ..config import settings


async def get_collaborative_recommendations(
    conn: AsyncConnection,
    user_id: str,
    top_n: int = 10,
    exclude_ids: list[str] | None = None,
) -> list[dict]:
    """
    Get recommendations based on similar users' interaction patterns.

    Builds a sparse user-recipe interaction matrix, finds similar users
    via cosine similarity, and aggregates their recipe scores.
    Returns empty list for cold-start users (< COLD_START_THRESHOLD interactions).
    """
    # Check if user has enough interactions
    result = await conn.execute(
        """
        SELECT interaction_count, cold_start
        FROM user_taste_profiles
        WHERE user_id = %s
        """,
        (user_id,),
    )
    profile = await result.fetchone()

    if not profile or profile["cold_start"]:
        return []

    if profile["interaction_count"] < settings.COLD_START_THRESHOLD:
        return []

    # Get this user's interactions
    result = await conn.execute(
        """
        SELECT recipe_id, interaction_type, interaction_value
        FROM user_interactions
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 200
        """,
        (user_id,),
    )
    user_interactions = await result.fetchall()

    if not user_interactions:
        return []

    user_recipe_ids = {row["recipe_id"] for row in user_interactions}

    # Find similar users (those who interacted with the same recipes)
    result = await conn.execute(
        """
        SELECT DISTINCT ui.user_id
        FROM user_interactions ui
        WHERE ui.recipe_id = ANY(%s)
        AND ui.user_id != %s
        LIMIT 50
        """,
        (list(user_recipe_ids), user_id),
    )
    similar_user_rows = await result.fetchall()
    similar_user_ids = [row["user_id"] for row in similar_user_rows]

    if not similar_user_ids:
        return []

    # Build interaction vectors for target user and similar users
    all_user_ids = [user_id] + similar_user_ids

    result = await conn.execute(
        """
        SELECT user_id, recipe_id, SUM(interaction_value) AS score
        FROM user_interactions
        WHERE user_id = ANY(%s)
        GROUP BY user_id, recipe_id
        """,
        (all_user_ids,),
    )
    all_interactions = await result.fetchall()

    # Build recipe index
    recipe_ids = sorted({row["recipe_id"] for row in all_interactions})
    recipe_idx = {rid: i for i, rid in enumerate(recipe_ids)}

    # Build user-recipe matrix
    user_idx = {uid: i for i, uid in enumerate(all_user_ids)}
    matrix = np.zeros((len(all_user_ids), len(recipe_ids)))

    for row in all_interactions:
        uid_i = user_idx.get(row["user_id"])
        rid_i = recipe_idx.get(row["recipe_id"])
        if uid_i is not None and rid_i is not None:
            matrix[uid_i, rid_i] = float(row["score"])

    # Compute cosine similarity between target user and others
    if matrix.shape[0] < 2:
        return []

    similarities = cosine_similarity(matrix[0:1], matrix[1:])[0]

    # Weight other users' scores by similarity
    weighted_scores = np.zeros(len(recipe_ids))
    for i, sim in enumerate(similarities):
        if sim > 0:
            weighted_scores += sim * matrix[i + 1]

    # Exclude recipes the user already interacted with
    exclude_set = set(exclude_ids or []) | user_recipe_ids
    for rid in exclude_set:
        if rid in recipe_idx:
            weighted_scores[recipe_idx[rid]] = 0

    # Get top N recipe IDs
    top_indices = np.argsort(weighted_scores)[::-1][:top_n * 2]
    top_recipe_ids = [recipe_ids[i] for i in top_indices if weighted_scores[i] > 0][:top_n]

    if not top_recipe_ids:
        return []

    # Fetch recipe titles
    result = await conn.execute(
        """
        SELECT id AS recipe_id, title
        FROM recipes
        WHERE id = ANY(%s)
        """,
        (top_recipe_ids,),
    )
    titles = {row["recipe_id"]: row["title"] for row in await result.fetchall()}

    return [
        {
            "recipe_id": rid,
            "title": titles.get(rid, "Unknown"),
            "score": float(weighted_scores[recipe_idx[rid]]),
            "source": "collaborative",
        }
        for rid in top_recipe_ids
    ]
