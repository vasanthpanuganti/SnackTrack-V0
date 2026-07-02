from pydantic import BaseModel, Field, field_validator


class RecommendRequest(BaseModel):
    user_id: str
    top_n: int = Field(default=10, ge=1, le=50)
    exclude_recipe_ids: list[str] = Field(default_factory=list)


class RecipeScore(BaseModel):
    recipe_id: str
    title: str
    score: float
    source: str  # "content", "collaborative", "hybrid"

    @field_validator("recipe_id", mode="before")
    @classmethod
    def _uuid_to_str(cls, v: object) -> str:
        # psycopg returns Postgres uuid columns as UUID objects; every
        # recommender feeds rows straight into this schema.
        return str(v)


class RecommendResponse(BaseModel):
    user_id: str
    recommendations: list[RecipeScore]
    is_cold_start: bool
    model_version: str = "v1"


class TrainRequest(BaseModel):
    user_id: str


class TrainResponse(BaseModel):
    user_id: str
    interaction_count: int
    is_cold_start: bool
    message: str
