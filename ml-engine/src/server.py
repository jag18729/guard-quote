"""
GuardQuote ML Engine - Dual Server (FastAPI + gRPC)

Runs both the REST API (for legacy/external clients) and
gRPC server (for internal backend communication) concurrently.
"""

import asyncio
import logging
import signal
import sys
import threading
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI

from .api import router
from .grpc_servicer import create_grpc_server
from . import __version__

logger = logging.getLogger(__name__)

# Configuration
FASTAPI_PORT = 8000
GRPC_PORT = 50051


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - start/stop gRPC server with FastAPI."""
    # Start gRPC server in background thread
    grpc_server = create_grpc_server(port=GRPC_PORT)
    grpc_server.start()
    logger.info(f"gRPC server started on port {GRPC_PORT}")
    
    yield
    
    # Shutdown gRPC server
    logger.info("Stopping gRPC server...")
    grpc_server.stop(grace=5)
    logger.info("gRPC server stopped")


def create_app() -> FastAPI:
    """Create FastAPI application with gRPC lifecycle management."""
    app = FastAPI(
        title="GuardQuote ML Engine",
        description="ML-powered security guard pricing and risk assessment",
        version=__version__,
        lifespan=lifespan,
    )
    
    app.include_router(router, prefix="/api/v1")
    
    @app.get("/")
    async def root():
        return {
            "service": "GuardQuote ML Engine",
            "version": __version__,
            "endpoints": {
                "rest": f"http://localhost:{FASTAPI_PORT}/api/v1",
                "grpc": f"localhost:{GRPC_PORT}",
            }
        }
    
    return app


def run_dual_server():
    """Run both FastAPI and gRPC servers."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    app = create_app()
    
    logger.info(f"Starting GuardQuote ML Engine v{__version__}")
    logger.info(f"  REST API: http://localhost:{FASTAPI_PORT}")
    logger.info(f"  gRPC:     localhost:{GRPC_PORT}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=FASTAPI_PORT,
        log_level="info",
    )


if __name__ == "__main__":
    run_dual_server()
