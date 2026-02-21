from fastapi import APIRouter

from ..db import get_db
from ..models.schemas import RecommendRequest, RecommendResponse
from ..recommender.hybrid import get_hybrid_recommendations

router = APIRouter()


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(request: RecommendRequest) -> RecommendResponse:
    """Get personalized recipe recommendations for a user."""
    async with get_db() as conn:
        return await get_hybrid_recommendations(
            conn,
            user_id=request.user_id,
            top_n=request.top_n,
            exclude_ids=request.exclude_recipe_ids or None,
        )
