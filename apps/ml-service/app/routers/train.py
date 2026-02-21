from fastapi import APIRouter

from ..db import get_db
from ..models.schemas import TrainRequest, TrainResponse
from ..recommender.hybrid import retrain_user_model

router = APIRouter()


@router.post("/train", response_model=TrainResponse)
async def train(request: TrainRequest) -> TrainResponse:
    """Retrain the recommendation model for a specific user."""
    async with get_db() as conn:
        return await retrain_user_model(conn, user_id=request.user_id)
