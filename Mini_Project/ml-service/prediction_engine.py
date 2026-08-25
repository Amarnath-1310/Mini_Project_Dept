"""
Clinical-NIDS: Prediction Engine Abstraction Layer
====================================================
Decouples data ingestion from the core prediction engine.

Current flow:  File Upload  -> DataFrame -> PredictionEngine -> Results
Future flow:   Live Capture -> Feature Extractor -> PredictionEngine -> Results

The NIDSPredictor remains unchanged when live traffic is added.
Only a new data source adapter is needed.

OPTIMIZED: Vectorized operations, batch predictions, minimal copies.
"""

import json
import uuid
import time
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable

import numpy as np
import pandas as pd

from predict import get_predictor

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"

# Columns to drop before prediction (identifiers / non-predictive)
DROP_COLS = [
    "Flow ID", "Source IP", "Destination IP", "Source IP.1",
    "Destination IP.1", "Timestamp", "Src IP", "Dst IP",
    "Source IP.2", "Destination IP.2",
]

# Severity thresholds as numpy conditions
_SEVERITY_NONE = "NONE"


def _compute_severity_vectorized(confidences: np.ndarray, labels: np.ndarray) -> np.ndarray:
    """Vectorized severity computation using np.select."""
    conditions = [
        labels == "Benign",
        confidences >= 0.90,
        confidences >= 0.70,
        confidences >= 0.50,
    ]
    choices = ["NONE", "CRITICAL", "HIGH", "MEDIUM"]
    return np.select(conditions, choices, default="LOW")


class PredictionEngine:
    """
    Abstract prediction engine that wraps the NIDSPredictor.

    Provides two entry points:
      - predict_from_features(dict)  : single flow (live traffic / API)
      - predict_from_dataframe(df)   : bulk analysis (file upload)

    Both call the same underlying NIDSPredictor, keeping the ML model
    decoupled from the data ingestion source.
    """

    def __init__(self):
        self._predictor = None

    @property
    def predictor(self):
        if self._predictor is None:
            self._predictor = get_predictor()
        return self._predictor

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Single-flow prediction (used by live traffic in future)
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    def predict_from_features(self, features: dict) -> dict:
        """Predict from a raw feature dictionary."""
        result = self.predictor.predict(features)
        result["id"] = str(uuid.uuid4())
        result["timestamp"] = datetime.utcnow().isoformat()
        return result

    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Bulk DataFrame prediction (OPTIMIZED)
    # â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    def predict_from_dataframe(
        self,
        df: pd.DataFrame,
        max_shap_samples: int = 100,
        progress_callback: Optional[Callable] = None,
    ) -> dict:
        """
        Run full analysis pipeline on a DataFrame.
        Optimized for 500k+ rows.

        Steps:
          1. Validate columns
          2. Preprocess (inf/NaN, feature selection, encoding)
          3. Batch predict (vectorized)
          4. SHAP explanation for sampled attack rows
          5. Aggregate statistics
        """
        t_start = time.time()
        predictor = self.predictor

        def _report(step, **kwargs):
            if progress_callback:
                try:
                    progress_callback(step, **kwargs)
                except Exception:
                    pass

        # â”€â”€ Step 1: Dataset validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        _report("Validating dataset...")
        total_rows = len(df)
        total_cols = len(df.columns)
        missing_values = int(df.isnull().sum().sum())
        duplicate_records = int(df.duplicated().sum())

        available_features = [c for c in predictor.feature_names if c in df.columns]
        features_count = len(available_features)
        missing_features = [c for c in predictor.feature_names if c not in df.columns]

        _report("Detecting supported columns...",
                total_rows=total_rows, rows_processed=0)

        # â”€â”€ Step 2: Preprocessing (in-place where possible) â”€â”€â”€â”€â”€â”€â”€â”€
        _report("Cleaning missing values...")

        # Drop identifier columns (creates new df only for dropped cols)
        existing_drop = [c for c in DROP_COLS if c in df.columns]
        if existing_drop:
            df = df.drop(columns=existing_drop, errors="ignore")

        # Handle infinities and NaN in numeric columns (in-place)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            # Use replace in-place to avoid copy
            df[numeric_cols] = df[numeric_cols].replace([np.inf, -np.inf], np.nan)
            df[numeric_cols] = df[numeric_cols].fillna(0)

        _report("Removing duplicate rows...")
        df = df.drop_duplicates()
        rows_after_dedup = len(df)

        # Encode Protocol if present and needed
        if "Protocol" in df.columns and "Protocol_encoded" not in df.columns:
            from sklearn.preprocessing import LabelEncoder
            le_proto = LabelEncoder()
            df["Protocol_encoded"] = le_proto.fit_transform(
                df["Protocol"].astype(str)
            )

        _report("Feature preprocessing...", rows_processed=rows_after_dedup)

        # â”€â”€ Step 3: Build feature matrix (vectorized) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        _report("Loading trained model...")

        # Build feature matrix using vectorized operations
        X_data = np.zeros((rows_after_dedup, len(predictor.feature_names)), dtype=np.float64)
        for ci, col in enumerate(predictor.feature_names):
            if col in df.columns:
                X_data[:, ci] = pd.to_numeric(df[col], errors="coerce").fillna(0).to_numpy(dtype=np.float64)

        _report("Running prediction...", total_rows=rows_after_dedup)

        # â”€â”€ Step 4: Batch prediction (vectorized) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        X_scaled = predictor.scaler.transform(X_data)
        pred_indices = predictor.model.predict(X_scaled)
        probabilities = predictor.model.predict_proba(X_scaled)

        # Batch inverse transform for labels (MUCH faster than per-row)
        all_labels = predictor.label_encoder.inverse_transform(pred_indices)

        # Batch confidence extraction
        confidences = probabilities[np.arange(len(pred_indices)), pred_indices]

        # Vectorized severity
        severities = _compute_severity_vectorized(confidences, all_labels)

        # Vectorized attack detection
        is_attack = all_labels != "Benign"

        _report("Generating Explainable AI results...")

        # â”€â”€ Step 5: Build per-row results (optimized loop) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        # Pre-compute class name arrays for probabilities
        class_names = predictor.label_encoder.classes_

        # Find attack indices using numpy
        attack_mask = is_attack
        attack_indices = np.where(attack_mask)[0].tolist()

        normal_count = int((~attack_mask).sum())
        attack_count = len(attack_indices)
        avg_confidence = round(float(confidences.mean()), 4)

        # Count attack types and severities using numpy/Counter
        attack_labels = all_labels[attack_mask]
        attack_type_counts = dict(Counter(attack_labels.tolist()))
        severity_counts = dict(Counter(severities.tolist()))
        # Ensure all severity keys exist
        for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"]:
            severity_counts.setdefault(sev, 0)

        # Build predictions list (sample for table - first 500)
        sample_size = min(500, rows_after_dedup)
        predictions = []
        total_confidence_sum = float(confidences.sum())

        # Build sample predictions using vectorized data
        for i in range(sample_size):
            pred_label = str(all_labels[i])
            conf = round(float(confidences[i]), 4)
            severity = str(severities[i])
            attack = bool(is_attack[i])

            # Build probability dict only for significant classes
            probs = probabilities[i]
            probs_dict = {}
            for ci_idx in range(len(probs)):
                p = float(probs[ci_idx])
                if p > 0.01:
                    probs_dict[str(class_names[ci_idx])] = round(p, 4)

            predictions.append({
                "id": str(uuid.uuid4()),
                "flow_index": i,
                "prediction": pred_label,
                "confidence": conf,
                "severity": severity,
                "is_attack": attack,
                "probabilities": probs_dict,
                "timestamp": datetime.utcnow().isoformat(),
            })

        # â”€â”€ Step 6: SHAP explanation for attack samples â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        shap_explanations = []
        if predictor.explainer is not None and attack_indices:
            sample_indices = attack_indices[:max_shap_samples]
            X_attack = X_scaled[sample_indices]

            try:
                shap_values = predictor.explainer.shap_values(X_attack)

                for si, row_idx in enumerate(sample_indices):
                    pred_idx = int(pred_indices[row_idx])
                    pred_label = str(all_labels[row_idx])

                    # Extract SHAP for the predicted class
                    if isinstance(shap_values, list):
                        class_shap = shap_values[pred_idx][si]
                    elif shap_values.ndim == 3:
                        class_shap = shap_values[si, :, pred_idx]
                    else:
                        class_shap = shap_values[si]

                    # Vectorized impact computation
                    impacts = np.abs(class_shap)
                    top_k = min(10, len(impacts))
                    top_indices = np.argpartition(impacts, -top_k)[-top_k:]
                    top_indices = top_indices[np.argsort(impacts[top_indices])[::-1]]

                    important_features = []
                    for fi in top_indices:
                        important_features.append({
                            "feature": str(predictor.feature_names[fi]),
                            "impact": round(float(impacts[fi]), 6),
                            "signed_impact": round(float(class_shap[fi]), 6),
                            "direction": "increases_attack" if class_shap[fi] > 0 else "decreases_attack",
                        })

                    shap_explanations.append({
                        "flow_index": row_idx,
                        "prediction": pred_label,
                        "important_features": important_features,
                    })
            except Exception as e:
                shap_explanations.append({"error": str(e)})

        _report("Calculating statistics...")

        # â”€â”€ Step 7: Aggregate attack category details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        attack_details = []
        for attack_type, count in sorted(attack_type_counts.items(), key=lambda x: -x[1]):
            # Compute average confidence for this attack type using mask
            type_mask = all_labels == attack_type
            type_confs = confidences[type_mask]
            avg_conf = round(float(type_confs.mean()), 4) if len(type_confs) > 0 else 0.0

            type_sevs = severities[type_mask]
            most_common_sev = Counter(type_sevs.tolist()).most_common(1)[0][0] if len(type_sevs) > 0 else "NONE"

            # Top features from SHAP for this attack type
            top_features = []
            attack_shaps = [s for s in shap_explanations if s.get("prediction") == attack_type]
            if attack_shaps:
                feature_impacts = {}
                for s in attack_shaps:
                    for f in s.get("important_features", []):
                        fname = f["feature"]
                        feature_impacts[fname] = feature_impacts.get(fname, 0) + f["impact"]
                sorted_features = sorted(feature_impacts.items(), key=lambda x: -x[1])[:5]
                for fname, imp in sorted_features:
                    level = "HIGH" if imp > 0.5 else "MEDIUM" if imp > 0.1 else "LOW"
                    top_features.append({"name": fname, "impact": round(imp, 4), "level": level})

            attack_details.append({
                "attack_type": attack_type,
                "count": count,
                "average_confidence": avg_conf,
                "severity": most_common_sev,
                "top_features": top_features,
            })

        # â”€â”€ Step 8: Global SHAP summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        global_feature_importance = []
        if shap_explanations:
            all_impacts = {}
            for s in shap_explanations:
                for f in s.get("important_features", []):
                    fname = f["feature"]
                    all_impacts[fname] = all_impacts.get(fname, 0) + f["impact"]
            sorted_global = sorted(all_impacts.items(), key=lambda x: -x[1])[:10]
            for fname, imp in sorted_global:
                level = "HIGH" if imp > 1.0 else "MEDIUM" if imp > 0.2 else "LOW"
                global_feature_importance.append({
                    "name": fname,
                    "impact": round(imp, 4),
                    "level": level,
                })

        # â”€â”€ Step 9: Determine overall risk level â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        risk_level = "LOW"
        if severity_counts.get("CRITICAL", 0) > 0:
            risk_level = "CRITICAL"
        elif severity_counts.get("HIGH", 0) > 0:
            risk_level = "HIGH"
        elif severity_counts.get("MEDIUM", 0) > 0:
            risk_level = "MEDIUM"

        # Model accuracy from report
        model_accuracy = 0.0
        report_path = MODEL_DIR / "model_report.json"
        if report_path.exists():
            with open(report_path) as f:
                report = json.load(f)
                model_accuracy = report.get("metrics", {}).get("accuracy", 0.0)

        _report("Saving results...")

        t_elapsed = round(time.time() - t_start, 2)
        print(f"[PredictionEngine] Analysis complete in {t_elapsed}s | "
              f"{rows_after_dedup:,} rows | {attack_count:,} attacks")

        return {
            "dataset_info": {
                "total_records": total_rows,
                "total_columns": total_cols,
                "features_count": features_count,
                "missing_values": missing_values,
                "duplicate_records": duplicate_records,
                "missing_features": missing_features[:20],
            },
            "security_summary": {
                "total_traffic": total_rows,
                "normal_count": normal_count,
                "attack_count": attack_count,
                "avg_confidence": avg_confidence,
                "risk_level": risk_level,
                "model_accuracy": model_accuracy,
            },
            "attack_distribution": attack_type_counts,
            "severity_distribution": severity_counts,
            "attack_details": attack_details,
            "global_feature_importance": global_feature_importance,
            "predictions": predictions,
            "total_predictions": rows_after_dedup,
            "processing_time_seconds": t_elapsed,
        }

    def generate_report_data(self, analysis_result: dict) -> dict:
        """Transform analysis result into a structured report payload."""
        info = analysis_result.get("dataset_info", {})
        summary = analysis_result.get("security_summary", {})
        return {
            "title": "Clinical-NIDS Security Analysis Report",
            "generated_at": datetime.utcnow().isoformat(),
            "dataset": {
                "filename": analysis_result.get("filename", "unknown"),
                "total_records": info.get("total_records", 0),
                "total_columns": info.get("total_columns", 0),
                "features_used": info.get("features_count", 0),
                "missing_values": info.get("missing_values", 0),
                "duplicates_removed": info.get("duplicate_records", 0),
            },
            "model": {
                "name": "XGBoost NIDS",
                "accuracy": summary.get("model_accuracy", 0),
            },
            "summary": {
                "total_traffic": summary.get("total_traffic", 0),
                "normal_traffic": summary.get("normal_count", 0),
                "attack_traffic": summary.get("attack_count", 0),
                "risk_level": summary.get("risk_level", "UNKNOWN"),
                "avg_confidence": summary.get("avg_confidence", 0),
            },
            "attack_categories": analysis_result.get("attack_details", []),
            "severity_distribution": analysis_result.get("severity_distribution", {}),
            "top_features": analysis_result.get("global_feature_importance", []),
        }


# â”€â”€ Singleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
_engine: Optional[PredictionEngine] = None


def get_prediction_engine() -> PredictionEngine:
    """Get or create the singleton prediction engine."""
    global _engine
    if _engine is None:
        _engine = PredictionEngine()
    return _engine
"""
Clinical-NIDS: Prediction Engine Abstraction Layer
====================================================
Decouples data ingestion from the core prediction engine.

Current flow:  File Upload  -> DataFrame -> PredictionEngine -> Results
Future flow:   Live Capture -> Feature Extractor -> PredictionEngine -> Results

The NIDSPredictor remains unchanged when live traffic is added.
Only a new data source adapter is needed.
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from predict import get_predictor

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"

# Columns to drop before prediction (identifiers / non-predictive)
DROP_COLS = [
    "Flow ID", "Source IP", "Destination IP", "Source IP.1",
    "Destination IP.1", "Timestamp", "Src IP", "Dst IP",
    "Source IP.2", "Destination IP.2",
]

# Attack type mapping (CICIDS2017 -> simplified categories)
ATTACK_MAP = {
    "Benign": "Benign",
    "DDoS": "DDoS",
    "DoS Hulk": "DoS",
    "DoS GoldenEye": "DoS",
    "DoS slowloris": "DoS",
    "DoS Slowhttptest": "DoS",
    "Heartbleed": "DoS",
    "SSH-Patator": "Brute Force",
    "FTP-Patator": "Brute Force",
    "PortScan": "PortScan",
    "Bot": "Botnet",
    "Infiltration": "Infiltration",
}

# Severity thresholds
SEVERITY_MAP = {
    "Benign": "NONE",
}


def _compute_severity(confidence: float, label: str) -> str:
    """Determine alert severity based on confidence and attack type."""
    if label == "Benign":
        return "NONE"
    if confidence >= 0.90:
        return "CRITICAL"
    elif confidence >= 0.70:
        return "HIGH"
    elif confidence >= 0.50:
        return "MEDIUM"
    else:
        return "LOW"


