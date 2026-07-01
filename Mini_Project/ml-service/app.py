"""
Clinical-NIDS: FastAPI Machine Learning Service
=================================================
REST API for network intrusion detection with explainable AI.

Endpoints:
  POST /api/upload              — Upload .parquet dataset, returns dataset_id
  POST /api/analyze/{id}        — Analyze uploaded dataset (ML + SHAP)
  GET  /api/analysis/{id}       — Get analysis result
  GET  /api/report/{id}         — Get report data for PDF generation
  POST /api/predict             — Single flow prediction
  POST /api/predict/batch       — Batch prediction
  GET  /api/model/info          — Model metadata & performance
  GET  /api/health              — Health check
  POST /api/simulate/start      — Start real-time traffic simulation
  POST /api/simulate/stop       — Stop simulation
"""

import json
import asyncio
import time
import uuid
import random
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from predict import get_predictor
from prediction_engine import get_prediction_engine

# ═══════════════════════════════════════════════════════════════════════════
# App Setup
# ═══════════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="Clinical-NIDS ML Service",
    description="AI-Based Clinical Network Intrusion Detection System — ML Prediction API",
    version="2.0.0",
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
DATA_DIR = BASE_DIR.parent / "results"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory stores
detection_store: list[dict] = []
dataset_store: dict[str, dict] = {}        # dataset_id -> metadata + results
simulation_task: Optional[asyncio.Task] = None
simulation_running = False


# ═══════════════════════════════════════════════════════════════════════════
# Request / Response Models
# ═══════════════════════════════════════════════════════════════════════════
class TrafficFeatures(BaseModel):
    """Network flow features for prediction."""
    flow_duration: float = 0
    protocol: float = 6  # TCP=6, UDP=17
    total_fwd_packets: float = 0
    total_backward_packets: float = 0
    fwd_packets_length_total: float = 0
    bwd_packets_length_total: float = 0
    fwd_packet_length_max: float = 0
    fwd_packet_length_min: float = 0
    fwd_packet_length_mean: float = 0
    fwd_packet_length_std: float = 0
    bwd_packet_length_max: float = 0
    bwd_packet_length_min: float = 0
    bwd_packet_length_mean: float = 0
    bwd_packet_length_std: float = 0
    flow_bytes_per_s: float = 0
    flow_packets_per_s: float = 0
    flow_iat_mean: float = 0
    flow_iat_std: float = 0
    flow_iat_max: float = 0
    flow_iat_min: float = 0
    fwd_iat_total: float = 0
    fwd_iat_mean: float = 0
    fwd_iat_std: float = 0
    fwd_iat_max: float = 0
    fwd_iat_min: float = 0
    bwd_iat_total: float = 0
    bwd_iat_mean: float = 0
    bwd_iat_std: float = 0
    bwd_iat_max: float = 0
    bwd_iat_min: float = 0
    fwd_psh_flags: float = 0
    bwd_psh_flags: float = 0
    fwd_urg_flags: float = 0
    bwd_urg_flags: float = 0
    fwd_header_length: float = 0
    bwd_header_length: float = 0
    fwd_packets_per_s: float = 0
    bwd_packets_per_s: float = 0
    packet_length_min: float = 0
    packet_length_max: float = 0
    packet_length_mean: float = 0
    packet_length_std: float = 0
    packet_length_variance: float = 0
    fin_flag_count: float = 0
    syn_flag_count: float = 0
    rst_flag_count: float = 0
    psh_flag_count: float = 0
    ack_flag_count: float = 0
    urg_flag_count: float = 0
    cwe_flag_count: float = 0
    ece_flag_count: float = 0
    down_up_ratio: float = 0
    avg_packet_size: float = 0
    avg_fwd_segment_size: float = 0
    avg_bwd_segment_size: float = 0
    fwd_avg_bytes_per_bulk: float = 0
    fwd_avg_packets_per_bulk: float = 0
    fwd_avg_bulk_rate: float = 0
    bwd_avg_bytes_per_bulk: float = 0
    bwd_avg_packets_per_bulk: float = 0
    bwd_avg_bulk_rate: float = 0
    subflow_fwd_packets: float = 0
    subflow_fwd_bytes: float = 0
    subflow_bwd_packets: float = 0
    subflow_bwd_bytes: float = 0
    init_fwd_win_bytes: float = 0
    init_bwd_win_bytes: float = 0
    fwd_act_data_packets: float = 0
    fwd_seg_size_min: float = 0
    active_mean: float = 0
    active_std: float = 0
    active_max: float = 0
    active_min: float = 0
    idle_mean: float = 0
    idle_std: float = 0
    idle_max: float = 0
    idle_min: float = 0

    # Optional metadata
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    source_port: Optional[int] = None
    destination_port: Optional[int] = None


# Feature name mapping: API field name -> dataset column name
FEATURE_MAP = {
    "flow_duration": "Flow Duration",
    "protocol": "Protocol_encoded",
    "total_fwd_packets": "Total Fwd Packets",
    "total_backward_packets": "Total Backward Packets",
    "fwd_packets_length_total": "Fwd Packets Length Total",
    "bwd_packets_length_total": "Bwd Packets Length Total",
    "fwd_packet_length_max": "Fwd Packet Length Max",
    "fwd_packet_length_min": "Fwd Packet Length Min",
    "fwd_packet_length_mean": "Fwd Packet Length Mean",
    "fwd_packet_length_std": "Fwd Packet Length Std",
    "bwd_packet_length_max": "Bwd Packet Length Max",
    "bwd_packet_length_min": "Bwd Packet Length Min",
    "bwd_packet_length_mean": "Bwd Packet Length Mean",
    "bwd_packet_length_std": "Bwd Packet Length Std",
    "flow_bytes_per_s": "Flow Bytes/s",
    "flow_packets_per_s": "Flow Packets/s",
    "flow_iat_mean": "Flow IAT Mean",
    "flow_iat_std": "Flow IAT Std",
    "flow_iat_max": "Flow IAT Max",
    "flow_iat_min": "Flow IAT Min",
    "fwd_iat_total": "Fwd IAT Total",
    "fwd_iat_mean": "Fwd IAT Mean",
    "fwd_iat_std": "Fwd IAT Std",
    "fwd_iat_max": "Fwd IAT Max",
    "fwd_iat_min": "Fwd IAT Min",
    "bwd_iat_total": "Bwd IAT Total",
    "bwd_iat_mean": "Bwd IAT Mean",
    "bwd_iat_std": "Bwd IAT Std",
    "bwd_iat_max": "Bwd IAT Max",
    "bwd_iat_min": "Bwd IAT Min",
    "fwd_psh_flags": "Fwd PSH Flags",
    "bwd_psh_flags": "Bwd PSH Flags",
    "fwd_urg_flags": "Fwd URG Flags",
    "bwd_urg_flags": "Bwd URG Flags",
    "fwd_header_length": "Fwd Header Length",
    "bwd_header_length": "Bwd Header Length",
    "fwd_packets_per_s": "Fwd Packets/s",
    "bwd_packets_per_s": "Bwd Packets/s",
    "packet_length_min": "Packet Length Min",
    "packet_length_max": "Packet Length Max",
    "packet_length_mean": "Packet Length Mean",
    "packet_length_std": "Packet Length Std",
    "packet_length_variance": "Packet Length Variance",
    "fin_flag_count": "FIN Flag Count",
    "syn_flag_count": "SYN Flag Count",
    "rst_flag_count": "RST Flag Count",
    "psh_flag_count": "PSH Flag Count",
    "ack_flag_count": "ACK Flag Count",
    "urg_flag_count": "URG Flag Count",
    "cwe_flag_count": "CWE Flag Count",
    "ece_flag_count": "ECE Flag Count",
    "down_up_ratio": "Down/Up Ratio",
    "avg_packet_size": "Avg Packet Size",
    "avg_fwd_segment_size": "Avg Fwd Segment Size",
    "avg_bwd_segment_size": "Avg Bwd Segment Size",
    "fwd_avg_bytes_per_bulk": "Fwd Avg Bytes/Bulk",
    "fwd_avg_packets_per_bulk": "Fwd Avg Packets/Bulk",
    "fwd_avg_bulk_rate": "Fwd Avg Bulk Rate",
    "bwd_avg_bytes_per_bulk": "Bwd Avg Bytes/Bulk",
    "bwd_avg_packets_per_bulk": "Bwd Avg Packets/Bulk",
    "bwd_avg_bulk_rate": "Bwd Avg Bulk Rate",
    "subflow_fwd_packets": "Subflow Fwd Packets",
    "subflow_fwd_bytes": "Subflow Fwd Bytes",
    "subflow_bwd_packets": "Subflow Bwd Packets",
    "subflow_bwd_bytes": "Subflow Bwd Bytes",
    "init_fwd_win_bytes": "Init Fwd Win Bytes",
    "init_bwd_win_bytes": "Init Bwd Win Bytes",
    "fwd_act_data_packets": "Fwd Act Data Packets",
    "fwd_seg_size_min": "Fwd Seg Size Min",
    "active_mean": "Active Mean",
    "active_std": "Active Std",
    "active_max": "Active Max",
    "active_min": "Active Min",
    "idle_mean": "Idle Mean",
    "idle_std": "Idle Std",
    "idle_max": "Idle Max",
    "idle_min": "Idle Min",
}


def map_features(traffic: TrafficFeatures) -> dict:
    """Convert API request to model feature dict."""
    data = traffic.model_dump()
    features = {}
    for api_key, model_key in FEATURE_MAP.items():
        features[model_key] = data.get(api_key, 0.0)
    return features


# ═══════════════════════════════════════════════════════════════════════════
# Dataset Upload & Analysis Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload a .parquet dataset file.

    Stores the file and returns a dataset_id.
    Does NOT run predictions — use POST /api/analyze/{dataset_id} for that.
    """
    if not file.filename:
        raise HTTPException(400, "No file provided")

    if not file.filename.endswith(".parquet"):
        raise HTTPException(400, "Only .parquet files are supported")

    dataset_id = str(uuid.uuid4())[:8]
    save_path = UPLOAD_DIR / f"{dataset_id}_{file.filename}"

    # Save uploaded file
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    # Store metadata
    dataset_store[dataset_id] = {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "file_path": str(save_path),
        "file_size": len(content),
        "status": "uploaded",
        "uploaded_at": datetime.utcnow().isoformat(),
        "analysis_result": None,
    }

    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "file_size": len(content),
        "status": "uploaded",
        "message": "Dataset uploaded successfully. Call POST /api/analyze/{dataset_id} to analyze.",
    }


@app.post("/api/analyze/{dataset_id}")
async def analyze_dataset(dataset_id: str):
    """
    Analyze an uploaded dataset.

    Runs:
      1. Data validation
      2. Preprocessing
      3. ML prediction (all rows)
      4. SHAP explanation (sampled attacks)
      5. Aggregate statistics

    Returns comprehensive analysis result.
    """
    if dataset_id not in dataset_store:
        raise HTTPException(404, f"Dataset '{dataset_id}' not found")

    ds = dataset_store[dataset_id]
    if ds["status"] == "analyzing":
        raise HTTPException(409, "Dataset is already being analyzed")

    ds["status"] = "analyzing"

    try:
        file_path = Path(ds["file_path"])
        if not file_path.exists():
            raise HTTPException(404, "Dataset file not found on disk")

        # Read parquet
        df = pd.read_parquet(file_path)

        # Run prediction engine
        engine = get_prediction_engine()
        result = engine.predict_from_dataframe(df)

        # Attach filename for report
        result["filename"] = ds["filename"]
        result["dataset_id"] = dataset_id

        # Store result
        ds["analysis_result"] = result
        ds["status"] = "completed"
        ds["analyzed_at"] = datetime.utcnow().isoformat()

        return result

    except HTTPException:
        raise
    except Exception as e:
        ds["status"] = "failed"
        ds["error"] = str(e)
        raise HTTPException(500, f"Analysis failed: {str(e)}")


@app.get("/api/analysis/{dataset_id}")
def get_analysis(dataset_id: str):
    """Get stored analysis result for a dataset."""
    if dataset_id not in dataset_store:
        raise HTTPException(404, f"Dataset '{dataset_id}' not found")

    ds = dataset_store[dataset_id]
    if ds["analysis_result"] is None:
        return {
            "dataset_id": dataset_id,
            "filename": ds["filename"],
            "status": ds["status"],
            "message": "Dataset not yet analyzed. Call POST /api/analyze/{dataset_id} first.",
        }

    return {
        "dataset_id": dataset_id,
        "filename": ds["filename"],
        "status": ds["status"],
        **ds["analysis_result"],
    }


@app.get("/api/report/{dataset_id}")
def get_report_data(dataset_id: str):
    """
    Get structured report data for PDF generation.

    Returns a clean, report-ready payload with:
      - Dataset info
      - Model accuracy
      - Attack statistics
      - Risk summary
      - Top important features
    """
    if dataset_id not in dataset_store:
        raise HTTPException(404, f"Dataset '{dataset_id}' not found")

    ds = dataset_store[dataset_id]
    if ds["analysis_result"] is None:
        raise HTTPException(400, "Dataset not yet analyzed")

    engine = get_prediction_engine()
    return engine.generate_report_data(ds["analysis_result"])


@app.get("/api/datasets")
def list_datasets():
    """List all uploaded datasets."""
    return {
        "datasets": [
            {
                "dataset_id": k,
                "filename": v["filename"],
                "file_size": v["file_size"],
                "status": v["status"],
                "uploaded_at": v["uploaded_at"],
                "analyzed_at": v.get("analyzed_at"),
            }
            for k, v in dataset_store.items()
        ],
        "count": len(dataset_store),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Single / Batch Prediction Endpoints (unchanged — for live traffic future)
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Clinical-NIDS ML Service",
        "model_loaded": True,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/model/info")
def model_info():
    """Return model metadata and performance metrics."""
    report_path = MODEL_DIR / "model_report.json"
    if report_path.exists():
        with open(report_path) as f:
            return json.load(f)
    return {"error": "Model report not found. Run train_model.py first."}


@app.post("/api/predict")
def predict(traffic: TrafficFeatures):
    """
    Predict attack type for a single network flow.

    Returns prediction, confidence, severity, and SHAP explanation.
    """
    engine = get_prediction_engine()
    features = map_features(traffic)
    result = engine.predict_from_features(features)

    # Add metadata
    detection = {
        "source_ip": traffic.source_ip or "unknown",
        "destination_ip": traffic.destination_ip or "unknown",
        "source_port": traffic.source_port,
        "destination_port": traffic.destination_port,
        **result,
    }

    # Store detection
    detection_store.append(detection)
    if len(detection_store) > 10000:
        detection_store.pop(0)

    return detection


@app.post("/api/predict/batch")
def predict_batch(traffic_list: list[TrafficFeatures]):
    """Predict multiple network flows at once."""
    engine = get_prediction_engine()
    results = []
    for traffic in traffic_list:
        features = map_features(traffic)
        result = engine.predict_from_features(features)
        detection = {
            "source_ip": traffic.source_ip or "unknown",
            "destination_ip": traffic.destination_ip or "unknown",
            **result,
        }
        detection_store.append(detection)
        results.append(detection)

    if len(detection_store) > 10000:
        detection_store[:] = detection_store[-10000:]

    return {"predictions": results, "count": len(results)}


@app.get("/api/detections")
def get_detections(limit: int = 100, offset: int = 0):
    """Get stored detection results."""
    total = len(detection_store)
    items = list(reversed(detection_store[offset:offset + limit]))
    return {"total": total, "items": items}


@app.get("/api/dashboard/statistics")
def dashboard_statistics():
    """Aggregate statistics for the frontend dashboard."""
    total = len(detection_store)
    attacks = [d for d in detection_store if d.get("is_attack")]
    benign = total - len(attacks)

    # Attack type counts
    attack_counts = {}
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "NONE": 0}
    for d in detection_store:
        pred = d.get("prediction", "Unknown")
        attack_counts[pred] = attack_counts.get(pred, 0) + 1
        sev = d.get("severity", "NONE")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    # Model info
    report_path = MODEL_DIR / "model_report.json"
    accuracy = 0
    if report_path.exists():
        with open(report_path) as f:
            report = json.load(f)
            accuracy = report.get("metrics", {}).get("accuracy", 0)

    # Dataset analysis stats
    dataset_stats = []
    for ds_id, ds in dataset_store.items():
        if ds.get("analysis_result"):
            summary = ds["analysis_result"].get("security_summary", {})
            dataset_stats.append({
                "dataset_id": ds_id,
                "filename": ds["filename"],
                "total_traffic": summary.get("total_traffic", 0),
                "normal_count": summary.get("normal_count", 0),
                "attack_count": summary.get("attack_count", 0),
                "risk_level": summary.get("risk_level", "UNKNOWN"),
                "model_accuracy": summary.get("model_accuracy", 0),
            })

    return {
        "total_flows": total,
        "total_attacks": len(attacks),
        "total_benign": benign,
        "attack_types": attack_counts,
        "severity_distribution": severity_counts,
        "model_accuracy": accuracy,
        "active_alerts": len([d for d in detection_store if d.get("severity") in ("CRITICAL", "HIGH")]),
        "datasets": dataset_stats,
        "total_datasets": len(dataset_store),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Traffic Simulator (kept for future live traffic support)
# ═══════════════════════════════════════════════════════════════════════════
_simulation_data = None
_simulation_index = 0


def _load_simulation_data():
    """Load a subset of the dataset for simulation."""
    global _simulation_data
    if _simulation_data is not None:
        return

    parquet_files = list(DATA_DIR.glob("*.parquet"))
    if not parquet_files:
        raise FileNotFoundError("No parquet files found in results/")

    frames = []
    for f in parquet_files:
        df = pd.read_parquet(f)
        sample_size = min(5000, len(df))
        frames.append(df.sample(n=sample_size, random_state=42))

    _simulation_data = pd.concat(frames, ignore_index=True).sample(frac=1, random_state=42).reset_index(drop=True)
    print(f"Simulation data loaded: {len(_simulation_data):,} rows")


async def _simulation_loop():
    """Continuously send dataset rows to the predictor."""
    global simulation_running, _simulation_index

    _load_simulation_data()
    engine = get_prediction_engine()
    df = _simulation_data

    print(f"[Simulator] Started — {len(df)} rows queued")

    while simulation_running and _simulation_index < len(df):
        row = df.iloc[_simulation_index]
        features = {}
        for col in engine.predictor.feature_names:
            if col in df.columns:
                val = row[col]
                features[col] = float(val) if pd.notna(val) else 0.0
            else:
                features[col] = 0.0

        result = engine.predict_from_features(features)

        detection = {
            "timestamp": datetime.utcnow().isoformat(),
            "source_ip": f"192.168.{random.randint(1,254)}.{random.randint(1,254)}",
            "destination_ip": f"10.0.{random.randint(0,5)}.{random.randint(1,254)}",
            "source_port": random.randint(1024, 65535),
            "destination_port": random.choice([22, 53, 80, 443, 445, 8080, 3389]),
            **result,
        }

        detection_store.append(detection)
        if len(detection_store) > 10000:
            detection_store.pop(0)

        _simulation_index += 1
        await asyncio.sleep(1.0)

    simulation_running = False
    print(f"[Simulator] Stopped at index {_simulation_index}")


@app.post("/api/simulate/start")
async def start_simulation():
    """Start the real-time traffic simulation."""
    global simulation_running, simulation_task, _simulation_index

    if simulation_running:
        return {"status": "already_running", "index": _simulation_index}

    simulation_running = True
    _simulation_index = 0
    simulation_task = asyncio.create_task(_simulation_loop())

    return {"status": "started", "message": "Traffic simulation started"}


@app.post("/api/simulate/stop")
def stop_simulation():
    """Stop the running simulation."""
    global simulation_running
    simulation_running = False
    return {"status": "stopped", "index": _simulation_index}


@app.get("/api/simulate/status")
def simulation_status():
    """Get simulation status."""
    return {
        "running": simulation_running,
        "index": _simulation_index,
        "total_detections": len(detection_store),
        "dataset_size": len(_simulation_data) if _simulation_data is not None else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Run
# ═══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  Clinical-NIDS ML Service v2.0")
    print("  Starting on http://localhost:8000")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
"""
Clinical-NIDS: FastAPI Machine Learning Service
=================================================
REST API for real-time network intrusion detection with explainable AI.

Endpoints:
  POST /api/predict          — Single flow prediction
  POST /api/predict/batch    — Batch prediction
  POST /api/upload           — Upload dataset for bulk analysis
  GET  /api/model/info       — Model metadata & performance
  GET  /api/health           — Health check
  POST /api/simulate/start   — Start real-time traffic simulation
  POST /api/simulate/stop    — Stop simulation
"""

import json
import asyncio
import time
import uuid
import random
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from predict import get_predictor

# ═══════════════════════════════════════════════════════════════════════════
# App Setup
# ═══════════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="Clinical-NIDS ML Service",
    description="AI-Based Clinical Network Intrusion Detection System — ML Prediction API",
    version="1.0.0",
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
DATA_DIR = BASE_DIR.parent / "results"

# In-memory store for detections (in production, use PostgreSQL via Spring Boot)
detection_store: list[dict] = []
simulation_task: Optional[asyncio.Task] = None
simulation_running = False


# ═══════════════════════════════════════════════════════════════════════════
# Request / Response Models
# ═══════════════════════════════════════════════════════════════════════════
class TrafficFeatures(BaseModel):
    """Network flow features for prediction."""
    flow_duration: float = 0
    protocol: float = 6  # TCP=6, UDP=17
    total_fwd_packets: float = 0
    total_backward_packets: float = 0
    fwd_packets_length_total: float = 0
    bwd_packets_length_total: float = 0
    fwd_packet_length_max: float = 0
    fwd_packet_length_min: float = 0
    fwd_packet_length_mean: float = 0
    fwd_packet_length_std: float = 0
    bwd_packet_length_max: float = 0
    bwd_packet_length_min: float = 0
    bwd_packet_length_mean: float = 0
    bwd_packet_length_std: float = 0
    flow_bytes_per_s: float = 0
    flow_packets_per_s: float = 0
    flow_iat_mean: float = 0
    flow_iat_std: float = 0
    flow_iat_max: float = 0
    flow_iat_min: float = 0
    fwd_iat_total: float = 0
    fwd_iat_mean: float = 0
    fwd_iat_std: float = 0
    fwd_iat_max: float = 0
    fwd_iat_min: float = 0
    bwd_iat_total: float = 0
    bwd_iat_mean: float = 0
    bwd_iat_std: float = 0
    bwd_iat_max: float = 0
    bwd_iat_min: float = 0
    fwd_psh_flags: float = 0
    bwd_psh_flags: float = 0
    fwd_urg_flags: float = 0
    bwd_urg_flags: float = 0
    fwd_header_length: float = 0
    bwd_header_length: float = 0
    fwd_packets_per_s: float = 0
    bwd_packets_per_s: float = 0
    packet_length_min: float = 0
    packet_length_max: float = 0
    packet_length_mean: float = 0
    packet_length_std: float = 0
    packet_length_variance: float = 0
    fin_flag_count: float = 0
    syn_flag_count: float = 0
    rst_flag_count: float = 0
    psh_flag_count: float = 0
    ack_flag_count: float = 0
    urg_flag_count: float = 0
    cwe_flag_count: float = 0
    ece_flag_count: float = 0
    down_up_ratio: float = 0
    avg_packet_size: float = 0
    avg_fwd_segment_size: float = 0
    avg_bwd_segment_size: float = 0
    fwd_avg_bytes_per_bulk: float = 0
    fwd_avg_packets_per_bulk: float = 0
    fwd_avg_bulk_rate: float = 0
    bwd_avg_bytes_per_bulk: float = 0
    bwd_avg_packets_per_bulk: float = 0
    bwd_avg_bulk_rate: float = 0
    subflow_fwd_packets: float = 0
    subflow_fwd_bytes: float = 0
    subflow_bwd_packets: float = 0
    subflow_bwd_bytes: float = 0
    init_fwd_win_bytes: float = 0
    init_bwd_win_bytes: float = 0
    fwd_act_data_packets: float = 0
    fwd_seg_size_min: float = 0
    active_mean: float = 0
    active_std: float = 0
    active_max: float = 0
    active_min: float = 0
    idle_mean: float = 0
    idle_std: float = 0
    idle_max: float = 0
    idle_min: float = 0

    # Optional metadata
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    source_port: Optional[int] = None
    destination_port: Optional[int] = None


# Feature name mapping: API field name -> dataset column name
FEATURE_MAP = {
    "flow_duration": "Flow Duration",
    "protocol": "Protocol_encoded",
    "total_fwd_packets": "Total Fwd Packets",
    "total_backward_packets": "Total Backward Packets",
    "fwd_packets_length_total": "Fwd Packets Length Total",
    "bwd_packets_length_total": "Bwd Packets Length Total",
    "fwd_packet_length_max": "Fwd Packet Length Max",
    "fwd_packet_length_min": "Fwd Packet Length Min",
    "fwd_packet_length_mean": "Fwd Packet Length Mean",
    "fwd_packet_length_std": "Fwd Packet Length Std",
    "bwd_packet_length_max": "Bwd Packet Length Max",
    "bwd_packet_length_min": "Bwd Packet Length Min",
    "bwd_packet_length_mean": "Bwd Packet Length Mean",
    "bwd_packet_length_std": "Bwd Packet Length Std",
    "flow_bytes_per_s": "Flow Bytes/s",
    "flow_packets_per_s": "Flow Packets/s",
    "flow_iat_mean": "Flow IAT Mean",
    "flow_iat_std": "Flow IAT Std",
    "flow_iat_max": "Flow IAT Max",
    "flow_iat_min": "Flow IAT Min",
    "fwd_iat_total": "Fwd IAT Total",
    "fwd_iat_mean": "Fwd IAT Mean",
    "fwd_iat_std": "Fwd IAT Std",
    "fwd_iat_max": "Fwd IAT Max",
    "fwd_iat_min": "Fwd IAT Min",
    "bwd_iat_total": "Bwd IAT Total",
    "bwd_iat_mean": "Bwd IAT Mean",
    "bwd_iat_std": "Bwd IAT Std",
    "bwd_iat_max": "Bwd IAT Max",
    "bwd_iat_min": "Bwd IAT Min",
    "fwd_psh_flags": "Fwd PSH Flags",
    "bwd_psh_flags": "Bwd PSH Flags",
    "fwd_urg_flags": "Fwd URG Flags",
    "bwd_urg_flags": "Bwd URG Flags",
    "fwd_header_length": "Fwd Header Length",
    "bwd_header_length": "Bwd Header Length",
    "fwd_packets_per_s": "Fwd Packets/s",
    "bwd_packets_per_s": "Bwd Packets/s",
    "packet_length_min": "Packet Length Min",
    "packet_length_max": "Packet Length Max",
    "packet_length_mean": "Packet Length Mean",
    "packet_length_std": "Packet Length Std",
    "packet_length_variance": "Packet Length Variance",
    "fin_flag_count": "FIN Flag Count",
    "syn_flag_count": "SYN Flag Count",
    "rst_flag_count": "RST Flag Count",
    "psh_flag_count": "PSH Flag Count",
    "ack_flag_count": "ACK Flag Count",
    "urg_flag_count": "URG Flag Count",
    "cwe_flag_count": "CWE Flag Count",
    "ece_flag_count": "ECE Flag Count",
    "down_up_ratio": "Down/Up Ratio",
    "avg_packet_size": "Avg Packet Size",
    "avg_fwd_segment_size": "Avg Fwd Segment Size",
    "avg_bwd_segment_size": "Avg Bwd Segment Size",
    "fwd_avg_bytes_per_bulk": "Fwd Avg Bytes/Bulk",
    "fwd_avg_packets_per_bulk": "Fwd Avg Packets/Bulk",
    "fwd_avg_bulk_rate": "Fwd Avg Bulk Rate",
    "bwd_avg_bytes_per_bulk": "Bwd Avg Bytes/Bulk",
    "bwd_avg_packets_per_bulk": "Bwd Avg Packets/Bulk",
    "bwd_avg_bulk_rate": "Bwd Avg Bulk Rate",
    "subflow_fwd_packets": "Subflow Fwd Packets",
    "subflow_fwd_bytes": "Subflow Fwd Bytes",
    "subflow_bwd_packets": "Subflow Bwd Packets",
    "subflow_bwd_bytes": "Subflow Bwd Bytes",
    "init_fwd_win_bytes": "Init Fwd Win Bytes",
    "init_bwd_win_bytes": "Init Bwd Win Bytes",
    "fwd_act_data_packets": "Fwd Act Data Packets",
    "fwd_seg_size_min": "Fwd Seg Size Min",
    "active_mean": "Active Mean",
    "active_std": "Active Std",
    "active_max": "Active Max",
    "active_min": "Active Min",
    "idle_mean": "Idle Mean",
    "idle_std": "Idle Std",
    "idle_max": "Idle Max",
    "idle_min": "Idle Min",
}


def map_features(traffic: TrafficFeatures) -> dict:
    """Convert API request to model feature dict."""
    data = traffic.model_dump()
    features = {}
    for api_key, model_key in FEATURE_MAP.items():
        features[model_key] = data.get(api_key, 0.0)
    return features


# ═══════════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Clinical-NIDS ML Service",
        "model_loaded": True,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/model/info")
def model_info():
    """Return model metadata and performance metrics."""
    report_path = MODEL_DIR / "model_report.json"
    if report_path.exists():
        with open(report_path) as f:
            return json.load(f)
    return {"error": "Model report not found. Run train_model.py first."}


@app.post("/api/predict")
def predict(traffic: TrafficFeatures):
    """
    Predict attack type for a single network flow.

    Returns prediction, confidence, severity, and SHAP explanation.
    """
    predictor = get_predictor()
    features = map_features(traffic)
    result = predictor.predict(features)

    # Add metadata
    detection = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "source_ip": traffic.source_ip or "unknown",
        "destination_ip": traffic.destination_ip or "unknown",
        "source_port": traffic.source_port,
        "destination_port": traffic.destination_port,
        **result,
    }

    # Store detection
    detection_store.append(detection)
    if len(detection_store) > 10000:
        detection_store.pop(0)

    return detection


@app.post("/api/predict/batch")
def predict_batch(traffic_list: list[TrafficFeatures]):
    """Predict multiple network flows at once."""
    predictor = get_predictor()
    results = []
    for traffic in traffic_list:
        features = map_features(traffic)
        result = predictor.predict(features)
        detection = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "source_ip": traffic.source_ip or "unknown",
            "destination_ip": traffic.destination_ip or "unknown",
            **result,
        }
        detection_store.append(detection)
        results.append(detection)

    if len(detection_store) > 10000:
        detection_store[:] = detection_store[-10000:]

    return {"predictions": results, "count": len(results)}


@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload a CSV or Parquet dataset for bulk analysis.
    Returns predictions for all rows.
    """
    if not file.filename:
        raise HTTPException(400, "No file provided")

    save_path = BASE_DIR / "data" / file.filename
    save_path.parent.mkdir(exist_ok=True)

    # Save uploaded file
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    # Read file
    if file.filename.endswith(".parquet"):
        df = pd.read_parquet(save_path)
    elif file.filename.endswith(".csv"):
        df = pd.read_csv(save_path)
    else:
        raise HTTPException(400, "Only .csv and .parquet files are supported")

    predictor = get_predictor()

    # Process rows (limit to 1000 for API response)
    max_rows = min(1000, len(df))
    df_sample = df.head(max_rows)

    predictions = []
    attacks = 0
    for _, row in df_sample.iterrows():
        features = {}
        for col in predictor.feature_names:
            if col in df_sample.columns:
                val = row[col]
                features[col] = float(val) if pd.notna(val) else 0.0
            else:
                features[col] = 0.0

        result = predictor.predict(features)
        if result["is_attack"]:
            attacks += 1
        predictions.append(result)

    return {
        "total_rows": len(df),
        "analyzed": max_rows,
        "attacks_detected": attacks,
        "benign": max_rows - attacks,
        "predictions": predictions[:50],  # Return first 50 for response size
    }


@app.get("/api/detections")
def get_detections(limit: int = 100, offset: int = 0):
    """Get stored detection results."""
    total = len(detection_store)
    items = list(reversed(detection_store[offset:offset + limit]))
    return {"total": total, "items": items}


@app.get("/api/dashboard/statistics")
def dashboard_statistics():
    """
    Aggregate statistics for the frontend dashboard.
    """
    total = len(detection_store)
    attacks = [d for d in detection_store if d.get("is_attack")]
    benign = total - len(attacks)

    # Attack type counts
    attack_counts = {}
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "NONE": 0}
    for d in detection_store:
        pred = d.get("prediction", "Unknown")
        attack_counts[pred] = attack_counts.get(pred, 0) + 1
        sev = d.get("severity", "NONE")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    # Model info
    report_path = MODEL_DIR / "model_report.json"
    accuracy = 0
    if report_path.exists():
        with open(report_path) as f:
            report = json.load(f)
            accuracy = report.get("metrics", {}).get("accuracy", 0)

    return {
        "total_flows": total,
        "total_attacks": len(attacks),
        "total_benign": benign,
        "attack_types": attack_counts,
        "severity_distribution": severity_counts,
        "model_accuracy": accuracy,
        "active_alerts": len([d for d in detection_store if d.get("severity") in ("CRITICAL", "HIGH")]),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Traffic Simulator
# ═══════════════════════════════════════════════════════════════════════════
_simulation_data = None
_simulation_index = 0


def _load_simulation_data():
    """Load a subset of the dataset for simulation."""
    global _simulation_data
    if _simulation_data is not None:
        return

    parquet_files = list(DATA_DIR.glob("*.parquet"))
    if not parquet_files:
        raise FileNotFoundError("No parquet files found in results/")

    # Load a sample from each file
    frames = []
    for f in parquet_files:
        df = pd.read_parquet(f)
        sample_size = min(5000, len(df))
        frames.append(df.sample(n=sample_size, random_state=42))

    _simulation_data = pd.concat(frames, ignore_index=True).sample(frac=1, random_state=42).reset_index(drop=True)
    print(f"Simulation data loaded: {len(_simulation_data):,} rows")


async def _simulation_loop():
    """Continuously send dataset rows to the predictor."""
    global simulation_running, _simulation_index

    _load_simulation_data()
    predictor = get_predictor()
    df = _simulation_data

    print(f"[Simulator] Started — {len(df)} rows queued")

    while simulation_running and _simulation_index < len(df):
        row = df.iloc[_simulation_index]
        features = {}
        for col in predictor.feature_names:
            if col in df.columns:
                val = row[col]
                features[col] = float(val) if pd.notna(val) else 0.0
            else:
                features[col] = 0.0

        result = predictor.predict(features)

        # Generate fake IPs for simulation
        detection = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "source_ip": f"192.168.{random.randint(1,254)}.{random.randint(1,254)}",
            "destination_ip": f"10.0.{random.randint(0,5)}.{random.randint(1,254)}",
            "source_port": random.randint(1024, 65535),
            "destination_port": random.choice([22, 53, 80, 443, 445, 8080, 3389]),
            **result,
        }

        detection_store.append(detection)
        if len(detection_store) > 10000:
            detection_store.pop(0)

        _simulation_index += 1
        await asyncio.sleep(1.0)  # 1 second interval

    simulation_running = False
    print(f"[Simulator] Stopped at index {_simulation_index}")


@app.post("/api/simulate/start")
async def start_simulation():
    """Start the real-time traffic simulation."""
    global simulation_running, simulation_task, _simulation_index

    if simulation_running:
        return {"status": "already_running", "index": _simulation_index}

    simulation_running = True
    _simulation_index = 0
    simulation_task = asyncio.create_task(_simulation_loop())

    return {"status": "started", "message": "Traffic simulation started"}


@app.post("/api/simulate/stop")
def stop_simulation():
    """Stop the running simulation."""
    global simulation_running
    simulation_running = False
    return {"status": "stopped", "index": _simulation_index}


@app.get("/api/simulate/status")
def simulation_status():
    """Get simulation status."""
    return {
        "running": simulation_running,
        "index": _simulation_index,
        "total_detections": len(detection_store),
        "dataset_size": len(_simulation_data) if _simulation_data is not None else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Run
# ═══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  Clinical-NIDS ML Service")
    print("  Starting on http://localhost:8000")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
