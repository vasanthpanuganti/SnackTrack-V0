"""Hybrid recommender blending all recommendation strategies.

Combines five recommendation approaches:
1. Content-Based Filtering: pgvector cosine similarity on recipe embeddings
2. Collaborative Filtering: User-user similarity from interaction patterns
3. Knowledge-Based: Expert nutritional guidelines and dietary constraints
4. VAE: Variational Autoencoder latent space recommendations
5. RNN: Sequential meal pattern predictions

The final score is a weighted blend that adapts based on user profile maturity.
"""

import numpy as np
from psycopg import AsyncConnection

from ..config import settings
from ..models.schemas import RecipeScore, RecommendResponse, TrainResponse
from .content_based import get_content_recommendations
from .collaborative import get_collaborative_recommendations
from .knowledge_based import get_knowledge_based_recommendations
from .vae import get_vae_recommendations
from .rnn import get_rnn_recommendations

# Interaction type weights for preference vector training
INTERACTION_WEIGHTS = {
    "cook": 5.0,
    "rate": 1.0,  # multiplied by actual rating value
    "view": 1.0,
    "swap_accept": 3.0,
    "swap_reject": -2.0,
    "log": 4.0,
}

# Model blend weights by user maturity stage
MODEL_WEIGHTS = {
    "cold_start": {
        "knowledge": 0.50,
        "content": 0.30,
        "collaborative": 0.00,
        "vae": 0.10,
        "rnn": 0.10,
    },
    "early": {  # 5-19 interactions
        "knowledge": 0.25,
        "content": 0.30,
        "collaborative": 0.15,
        "vae": 0.15,
        "rnn": 0.15,
    },
    "mature": {  # 20+ interactions
        "knowledge": 0.15,
        "content": 0.20,
        "collaborative": 0.25,
        "vae": 0.20,
        "rnn": 0.20,
    },
}


def _get_maturity_stage(interaction_count: int, is_cold_start: bool) -> str:
    if is_cold_start or interaction_count < settings.COLD_START_THRESHOLD:
        return "cold_start"
    elif interaction_count < 20:
        return "early"
    return "mature"


async def get_hybrid_recommendations(
    conn: AsyncConnection,
    user_id: str,
    top_n: int = 10,
    exclude_ids: list[str] | None = None,
) -> RecommendResponse:
    """
    Get hybrid recommendations by blending all model scores.

    Fetches candidates from each recommender in parallel-style,
    combines scores using maturity-adapted weights,
    deduplicates, and returns top N.
    """
    # Get user profile
    result = await conn.execute(
        """
        SELECT content_weight, collab_weight, cold_start, interaction_count
        FROM user_taste_profiles
        WHERE user_id = %s
        """,
        (user_id,),
    )
    profile = await result.fetchone()

    is_cold_start = True
    interaction_count = 0

    if profile:
        is_cold_start = profile["cold_start"]
        interaction_count = profile["interaction_count"]

    maturity = _get_maturity_stage(interaction_count, is_cold_start)
    weights = MODEL_WEIGHTS[maturity]

    # Gather recommendations from all models
    all_recs: dict[str, list[dict]] = {}

    # Content-based (always available if user has a taste profile)
    all_recs["content"] = await get_content_recommendations(
        conn, user_id, top_n * 2, exclude_ids
    )

    # Knowledge-based (always available — uses dietary guidelines)
    all_recs["knowledge"] = await get_knowledge_based_recommendations(
        conn, user_id, top_n * 2, exclude_ids
    )

    # Collaborative (only for non-cold-start users)
    if maturity != "cold_start":
        all_recs["collaborative"] = await get_collaborative_recommendations(
            conn, user_id, top_n * 2, exclude_ids
        )
    else:
        all_recs["collaborative"] = []

    # VAE (works even with limited data)
    all_recs["vae"] = await get_vae_recommendations(
        conn, user_id, top_n * 2, exclude_ids
    )

    # RNN (needs meal history)
    all_recs["rnn"] = await get_rnn_recommendations(
        conn, user_id, top_n * 2, exclude_ids
    )

    # Check if we have any recommendations at all
    total_recs = sum(len(v) for v in all_recs.values())
    if total_recs == 0:
        return await _fallback_popular(conn, user_id, top_n, exclude_ids)

    # Normalize scores within each model to [0, 1]
    for model_name, recs in all_recs.items():
        if not recs:
            continue
        max_score = max(r["score"] for r in recs) or 1.0
        min_score = min(r["score"] for r in recs)
        score_range = max_score - min_score
        if score_range > 0:
            for r in recs:
                r["score"] = (r["score"] - min_score) / score_range
        else:
            for r in recs:
                r["score"] = 1.0

    # Merge scores with weighted blending
    combined: dict[str, dict] = {}

    for model_name, recs in all_recs.items():
        model_weight = weights.get(model_name, 0.0)
        if model_weight <= 0:
            continue

        for rec in recs:
            rid = rec["recipe_id"]
            if rid in combined:
                combined[rid]["score"] += model_weight * rec["score"]
            else:
                combined[rid] = {
                    "recipe_id": rid,
                    "title": rec["title"],
                    "score": model_weight * rec["score"],
                    "source": "hybrid",
                }

    # Sort and take top N
    sorted_recs = sorted(combined.values(), key=lambda x: x["score"], reverse=True)[:top_n]

    return RecommendResponse(
        user_id=user_id,
        recommendations=[RecipeScore(**r) for r in sorted_recs],
        is_cold_start=is_cold_start,
    )


async def _fallback_popular(
    conn: AsyncConnection,
    user_id: str,
    top_n: int,
    exclude_ids: list[str] | None,
) -> RecommendResponse:
    """Fall back to popular recipes when no personalized recommendations available."""
    exclude_clause = ""
    params: list = [top_n]
    if exclude_ids:
        exclude_clause = "WHERE r.id != ALL(%s)"
        params.insert(0, exclude_ids)

    result = await conn.execute(
        f"""
        SELECT r.id AS recipe_id, r.title, COUNT(ui.id) AS popularity
        FROM recipes r
        LEFT JOIN user_interactions ui ON ui.recipe_id = r.id
        {exclude_clause}
        GROUP BY r.id, r.title
        ORDER BY popularity DESC
        LIMIT %s
        """,
        tuple(params),
    )
    rows = await result.fetchall()

    max_pop = max((row["popularity"] for row in rows), default=1) or 1

    return RecommendResponse(
        user_id=user_id,
        recommendations=[
            RecipeScore(
                recipe_id=row["recipe_id"],
                title=row["title"],
                score=float(row["popularity"]) / max_pop,
                source="popular",
            )
            for row in rows
        ],
        is_cold_start=True,
    )


async def retrain_user_model(
    conn: AsyncConnection,
    user_id: str,
) -> TrainResponse:
    """
    Retrain user preference model from interaction history.

    Rebuilds the preference vector from weighted interactions and
    updates user_taste_profiles.
    """
    # Get user interactions
    result = await conn.execute(
        """
        SELECT ui.recipe_id, ui.interaction_type, ui.interaction_value,
               r.ingredient_vector, r.nutrition_vector
        FROM user_interactions ui
        JOIN recipes r ON r.id = ui.recipe_id
        WHERE ui.user_id = %s
        AND r.ingredient_vector IS NOT NULL
        ORDER BY ui.created_at DESC
        LIMIT 500
        """,
        (user_id,),
    )
    interactions = await result.fetchall()

    interaction_count = len(interactions)
    is_cold_start = interaction_count < settings.COLD_START_THRESHOLD

    if interaction_count == 0:
        # Ensure profile exists even for cold-start users
        await conn.execute(
            """
            INSERT INTO user_taste_profiles (user_id, cold_start, interaction_count)
            VALUES (%s, true, 0)
            ON CONFLICT (user_id) DO UPDATE SET
                cold_start = true,
                interaction_count = 0,
                last_trained_at = NOW()
            """,
            (user_id,),
        )
        await conn.commit()
        return TrainResponse(
            user_id=user_id,
            interaction_count=0,
            is_cold_start=True,
            message="No interactions found. Profile initialized as cold start.",
        )

    # Compute weighted preference vector
    vectors = []
    weights = []

    for interaction in interactions:
        vec = interaction.get("ingredient_vector")
        if vec is None:
            continue

        itype = interaction["interaction_type"]
        ivalue = float(interaction["interaction_value"] or 0)

        weight = INTERACTION_WEIGHTS.get(itype, 1.0)
        if itype == "rate":
            weight *= ivalue

        vectors.append(np.array(vec))
        weights.append(weight)

    if not vectors:
        return TrainResponse(
            user_id=user_id,
            interaction_count=interaction_count,
            is_cold_start=True,
            message="No recipe vectors available for training.",
        )

    # Weighted average of recipe vectors
    vectors_arr = np.array(vectors)
    weights_arr = np.array(weights).reshape(-1, 1)

    # Normalize weights to avoid negative total
    weights_arr = np.clip(weights_arr, -10, 10)
    total_weight = np.abs(weights_arr).sum()
    if total_weight == 0:
        total_weight = 1.0

    preference_vector = (vectors_arr * weights_arr).sum(axis=0) / total_weight

    # Normalize to unit vector
    norm = np.linalg.norm(preference_vector)
    if norm > 0:
        preference_vector = preference_vector / norm

    # Determine blend weights based on maturity
    maturity = _get_maturity_stage(interaction_count, is_cold_start)
    model_weights = MODEL_WEIGHTS[maturity]
    content_weight = model_weights["content"]
    collab_weight = model_weights["collaborative"]

    # Update profile
    await conn.execute(
        """
        INSERT INTO user_taste_profiles (
            user_id, preference_vector, interaction_count,
            cold_start, content_weight, collab_weight, last_trained_at
        )
        VALUES (%s, %s::vector, %s, %s, %s, %s, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            preference_vector = %s::vector,
            interaction_count = %s,
            cold_start = %s,
            content_weight = %s,
            collab_weight = %s,
            last_trained_at = NOW()
        """,
        (
            user_id, preference_vector.tolist(), interaction_count,
            is_cold_start, content_weight, collab_weight,
            preference_vector.tolist(), interaction_count,
            is_cold_start, content_weight, collab_weight,
        ),
    )
    await conn.commit()

    return TrainResponse(
        user_id=user_id,
        interaction_count=interaction_count,
        is_cold_start=is_cold_start,
        message=f"Model retrained with {interaction_count} interactions. Maturity: {maturity}.",
    )
