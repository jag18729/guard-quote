from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import router
from .config import get_settings
from . import __version__

settings = get_settings()

app = FastAPI(
    title="GuardQuote ML Engine",
    description="ML-powered pricing and risk assessment for security guard services",
    version=__version__,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1", tags=["ML Engine"])


@app.get("/")
async def root():
    return {
        "service": "GuardQuote ML Engine",
        "version": __version__,
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """Top-level health check (alias for /api/v1/health)."""
    from .models.trained_predictor import get_predictor
    predictor = get_predictor()
    return {
        "status": "healthy",
        "version": __version__,
        "model_loaded": predictor.loaded,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.ml_engine_host,
        port=settings.ml_engine_port,
        reload=True,
    )
