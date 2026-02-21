from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://localhost:5432/snacktrack"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "info"

    # Recommendation settings
    DEFAULT_TOP_N: int = 10
    CONTENT_WEIGHT: float = 0.6
    COLLAB_WEIGHT: float = 0.4
    COLD_START_THRESHOLD: int = 5

    # Trained weight file paths (empty = use default paths or random fallback)
    VAE_WEIGHTS_PATH: str = ""
    RNN_WEIGHTS_PATH: str = ""

    model_config = {"env_prefix": "ML_"}


settings = Settings()
