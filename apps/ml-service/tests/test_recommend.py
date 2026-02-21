"""Tests for recommendation endpoints."""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.schemas import RecommendResponse, RecipeScore


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
