"""
Clinical-NIDS ML Service — Main Entry Point
=============================================
FastAPI application for network intrusion detection with explainable AI.

Run with:  python -m app.main
       or:  uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure root ml-service/ directory is on sys.path so that
# root-level modules (predict.py, prediction_engine.py) can be imported.
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.prediction import router as prediction_router
from app.api.live_traffic import router as live_traffic_router


# ═══════════════════════════════════════════════════════════════════════
# Startup / Shutdown
# ═══════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML model at startup for faster first request."""
    print("=" * 60)
    print("  MedSentry-XAI: Real-Time Traffic Analysis & ML Engine v2.0")
    print("  Loading model at startup...")
    print("=" * 60)
    try:
        from predict import get_predictor
        predictor = get_predictor()
        print(f"  Model loaded successfully: {len(predictor.feature_names)} features")
        print(f"  Classes: {list(predictor.label_encoder.classes_)}")
    except Exception as e:
        print(f"  WARNING: Model loading failed: {e}")
        print("  Model will be loaded on first request.")
    print("=" * 60)
    yield
    print("MedSentry-XAI ML Service shutting down...")


# ═══════════════════════════════════════════════════════════════════════
# App Setup
# ═══════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="MedSentry-XAI ML & Traffic Service",
    description="Real-Time Traffic Analysis & Interactive Explainable Cyber-Defense for Healthcare",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow Spring Boot backend and React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routes
app.include_router(prediction_router)
app.include_router(live_traffic_router)


# ═══════════════════════════════════════════════════════════════════════
# Run
# ═══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  Clinical-NIDS ML Service v2.0")
    print("  Starting on http://localhost:8000")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
