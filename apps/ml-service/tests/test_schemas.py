"""Schema coercion tests.

psycopg returns Postgres uuid columns as uuid.UUID objects and every
recommender feeds DB rows straight into RecipeScore. Regression test for
the bug where UUID input failed str validation and 500'd /recommend.
"""

from uuid import UUID

from app.models.schemas import RecipeScore, RecommendResponse


def test_recipe_score_accepts_uuid_recipe_id():
    score = RecipeScore(
        recipe_id=UUID("1d07a4c3-1a65-44ad-bcda-ba81bc23fe6d"),
        title="Greek Yogurt Parfait",
        score=0.42,
        source="hybrid",
    )
    assert score.recipe_id == "1d07a4c3-1a65-44ad-bcda-ba81bc23fe6d"
    assert isinstance(score.recipe_id, str)


def test_recipe_score_accepts_str_recipe_id():
    score = RecipeScore(
        recipe_id="1d07a4c3-1a65-44ad-bcda-ba81bc23fe6d",
        title="Greek Yogurt Parfait",
        score=0.42,
        source="content",
    )
    assert score.recipe_id == "1d07a4c3-1a65-44ad-bcda-ba81bc23fe6d"


def test_recommend_response_serializes_uuid_scores():
    response = RecommendResponse(
        user_id="user-1",
        recommendations=[
            RecipeScore(
                recipe_id=UUID("1d07a4c3-1a65-44ad-bcda-ba81bc23fe6d"),
                title="Salmon Bowl",
                score=1.0,
                source="hybrid",
            )
        ],
        is_cold_start=True,
    )
    payload = response.model_dump()
    assert payload["recommendations"][0]["recipe_id"] == (
        "1d07a4c3-1a65-44ad-bcda-ba81bc23fe6d"
    )
