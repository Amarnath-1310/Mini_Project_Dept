"""
Prediction Service
==================
Wraps the core PredictionEngine for use by the API layer.
Delegates to prediction_engine.py at the project root.
"""

import sys
from pathlib import Path

# Add parent directory to path so we can import root-level modules
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from prediction_engine import get_prediction_engine, PredictionEngine


def analyze_dataset(df) -> dict:
    """
    Run full ML analysis on a DataFrame.

    Returns comprehensive analysis result with:
      - dataset_info
      - security_summary
      - attack_distribution
      - severity_distribution
      - attack_details (with SHAP)
      - global_feature_importance
      - predictions (sample)
    """
    engine = get_prediction_engine()
    return engine.predict_from_dataframe(df)


def predict_single(features: dict) -> dict:
    """Predict a single network flow."""
    engine = get_prediction_engine()
    return engine.predict_from_features(features)


def generate_report_data(analysis_result: dict) -> dict:
    """Generate structured report data from analysis result."""
    engine = get_prediction_engine()
    return engine.generate_report_data(analysis_result)


def get_model_info() -> dict:
    """Get model metadata and performance metrics."""
    import json
    report_path = ROOT_DIR / "model" / "model_report.json"
    if report_path.exists():
        with open(report_path) as f:
            return json.load(f)
    return {"error": "Model report not found. Run train_model.py first."}
