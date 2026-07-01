"""
Clinical-NIDS ML Service — Main Entry Point
=============================================
FastAPI application for network intrusion detection with explainable AI.

Run with:  python -m app.main
       or:  uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

import sys
from pathlib import Path

# Ensure root ml-service/ directory is on sys.path so that
# root-level modules (predict.py, prediction_engine.py) can be imported.
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.prediction import router as prediction_router

# ═══════════════════════════════════════════════════════════════════════
# App Setup
# ═══════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="Clinical-NIDS ML Service",
    description="AI-Based Clinical Network Intrusion Detection System — ML Prediction API",
    version="2.0.0",
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
