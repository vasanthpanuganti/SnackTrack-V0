"""Tests for recommendation endpoints."""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.schemas import RecommendResponse, RecipeScore
from app.recommender.content_based import get_content_recommendations


class _FakeResult:
    def __init__(self, *, one=None, many=None):
        self._one = one
        self._many = many or []

    async def fetchone(self):
        return self._one

    async def fetchall(self):
        return self._many


class _ContentRecommendationConn:
    def __init__(self, expected_calls):
        self.expected_calls = expected_calls
        self.calls = []

    async def execute(self, query, params):
        self.calls.append((query, params))

        if "FROM user_taste_profiles" in query:
            return _FakeResult(
                one={
                    "preference_vector": [0.1, 0.2, 0.3],
                    "interaction_count": 8,
                }
            )

        expected_params, rows = self.expected_calls.pop(0)
        assert params == expected_params
        assert query.count("%s") == len(params)
        return _FakeResult(many=rows)


@asynccontextmanager
async def _mock_get_db():
    yield MagicMock()


@pytest.fixture
async def client():
    """Create a test client with mocked database."""
    with patch("app.db.init_db", new_callable=AsyncMock):
        with patch("app.db.close_db", new_callable=AsyncMock):
            with patch("app.routers.recommend.get_db", _mock_get_db):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as ac:
                    yield ac


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ml-service"


@pytest.mark.asyncio
async def test_recommend_returns_recommendations(client: AsyncClient):
    mock_response = RecommendResponse(
        user_id="user-001",
        recommendations=[
            RecipeScore(
                recipe_id="recipe-1",
                title="Chicken Salad",
                score=0.95,
                source="hybrid",
            ),
            RecipeScore(
                recipe_id="recipe-2",
                title="Veggie Wrap",
                score=0.87,
                source="content",
            ),
        ],
        is_cold_start=False,
    )

    with patch(
        "app.routers.recommend.get_hybrid_recommendations",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        response = await client.post(
            "/recommend",
            json={"user_id": "user-001", "top_n": 10},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "user-001"
    assert len(data["recommendations"]) == 2
    assert data["recommendations"][0]["title"] == "Chicken Salad"
    assert data["is_cold_start"] is False


@pytest.mark.asyncio
async def test_recommend_cold_start(client: AsyncClient):
    mock_response = RecommendResponse(
        user_id="new-user",
        recommendations=[
            RecipeScore(
                recipe_id="popular-1",
                title="Popular Recipe",
                score=1.0,
                source="popular",
            ),
        ],
        is_cold_start=True,
    )

    with patch(
        "app.routers.recommend.get_hybrid_recommendations",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        response = await client.post(
            "/recommend",
            json={"user_id": "new-user", "top_n": 5},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["is_cold_start"] is True
    assert data["recommendations"][0]["source"] == "popular"


@pytest.mark.asyncio
async def test_recommend_validates_top_n(client: AsyncClient):
    response = await client.post(
        "/recommend",
        json={"user_id": "user-001", "top_n": 0},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_recommend_validates_missing_user_id(client: AsyncClient):
    response = await client.post("/recommend", json={"top_n": 10})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_content_recommendations_binds_vector_params_in_sql_order():
    vector = [0.1, 0.2, 0.3]
    conn = _ContentRecommendationConn(
        expected_calls=[
            (
                (vector, vector, 6),
                [
                    {
                        "recipe_id": "ingredient-match",
                        "title": "Ingredient Match",
                        "similarity_score": 0.9,
                    }
                ],
            ),
            (
                (vector, vector, 3),
                [
                    {
                        "recipe_id": "nutrition-match",
                        "title": "Nutrition Match",
                        "similarity_score": 0.8,
                    }
                ],
            ),
        ]
    )

    recommendations = await get_content_recommendations(conn, "user-001", top_n=3)

    assert [rec["recipe_id"] for rec in recommendations] == [
        "ingredient-match",
        "nutrition-match",
    ]
    assert conn.expected_calls == []


@pytest.mark.asyncio
async def test_content_recommendations_binds_exclusions_before_order_vector():
    vector = [0.1, 0.2, 0.3]
    exclude_ids = ["recipe-to-skip"]
    conn = _ContentRecommendationConn(
        expected_calls=[
            (
                (vector, exclude_ids, vector, 4),
                [],
            ),
            (
                (vector, exclude_ids, vector, 2),
                [],
            ),
        ]
    )

    recommendations = await get_content_recommendations(
        conn,
        "user-001",
        top_n=2,
        exclude_ids=exclude_ids,
    )

    assert recommendations == []
    assert conn.expected_calls == []
