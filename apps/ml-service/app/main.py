from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from .config import settings
from .db import init_db, close_db
from .routers import recommend, train


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown events."""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="SnackTrack ML Service",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(recommend.router)
app.include_router(train.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "healthy", "service": "ml-service"}
