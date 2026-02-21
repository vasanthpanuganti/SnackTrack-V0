"""Tests for training endpoints."""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.schemas import TrainResponse


@asynccontextmanager
async def _mock_get_db():
    yield MagicMock()


@pytest.fixture
async def client():
    """Create a test client with mocked database."""
    with patch("app.db.init_db", new_callable=AsyncMock):
        with patch("app.db.close_db", new_callable=AsyncMock):
            with patch("app.routers.train.get_db", _mock_get_db):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as ac:
                    yield ac


@pytest.mark.asyncio
async def test_train_user_model(client: AsyncClient):
    mock_response = TrainResponse(
        user_id="user-001",
        interaction_count=25,
        is_cold_start=False,
        message="Model retrained with 25 interactions.",
    )

    with patch(
        "app.routers.train.retrain_user_model",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        response = await client.post("/train", json={"user_id": "user-001"})

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "user-001"
    assert data["interaction_count"] == 25
    assert data["is_cold_start"] is False


@pytest.mark.asyncio
async def test_train_cold_start_user(client: AsyncClient):
    mock_response = TrainResponse(
        user_id="new-user",
        interaction_count=0,
        is_cold_start=True,
        message="No interactions found. Profile initialized as cold start.",
    )

    with patch(
        "app.routers.train.retrain_user_model",
        new_callable=AsyncMock,
        return_value=mock_response,
    ):
        response = await client.post("/train", json={"user_id": "new-user"})

    assert response.status_code == 200
    data = response.json()
    assert data["is_cold_start"] is True
    assert data["interaction_count"] == 0


@pytest.mark.asyncio
async def test_train_validates_missing_user_id(client: AsyncClient):
    response = await client.post("/train", json={})
    assert response.status_code == 422
