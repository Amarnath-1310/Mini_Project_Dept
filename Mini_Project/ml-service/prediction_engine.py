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

    # ────────────────────────────────────────────────────────────────
    # Single-flow prediction (used by live traffic in future)
    # ────────────────────────────────────────────────────────────────
    def predict_from_features(self, features: dict) -> dict:
        """
        Predict from a raw feature dictionary.

        Parameters
        ----------
        features : dict
            feature_name -> value

        Returns
        -------
        dict with prediction, confidence, severity, explanation, etc.
        """
        result = self.predictor.predict(features)
        result["id"] = str(uuid.uuid4())
        result["timestamp"] = datetime.utcnow().isoformat()
        return result

    # ────────────────────────────────────────────────────────────────
    # Bulk DataFrame prediction (used by file upload)
    # ────────────────────────────────────────────────────────────────
    def predict_from_dataframe(
        self,
        df: pd.DataFrame,
        max_shap_samples: int = 100,
    ) -> dict:
        """
        Run full analysis pipeline on a DataFrame.

        Steps:
          1. Validate columns
          2. Preprocess (inf/NaN, feature selection, encoding, scaling)
          3. Batch predict
          4. SHAP explanation for sampled attack rows
          5. Aggregate statistics

        Parameters
        ----------
        df : pd.DataFrame
            Raw parquet data with CICIDS2017-style columns.
        max_shap_samples : int
            Max number of attack rows to compute SHAP values for.

        Returns
        -------
        dict with full analysis result.
        """
        predictor = self.predictor

        # ── Step 1: Dataset validation ──────────────────────────────
        total_rows = len(df)
        total_cols = len(df.columns)
        missing_values = int(df.isnull().sum().sum())
        duplicate_records = int(df.duplicated().sum())

        available_features = [c for c in predictor.feature_names if c in df.columns]
        features_count = len(available_features)
        missing_features = [c for c in predictor.feature_names if c not in df.columns]

        # ── Step 2: Preprocessing ───────────────────────────────────
        df_proc = df.copy()

        # Drop identifier columns
        existing_drop = [c for c in DROP_COLS if c in df_proc.columns]
        if existing_drop:
            df_proc = df_proc.drop(columns=existing_drop, errors="ignore")

        # Handle infinities and NaN in numeric columns
        numeric_cols = df_proc.select_dtypes(include=[np.number]).columns
        df_proc[numeric_cols] = df_proc[numeric_cols].replace([np.inf, -np.inf], np.nan)
        df_proc[numeric_cols] = df_proc[numeric_cols].fillna(0)

        # Remove duplicates
        df_proc = df_proc.drop_duplicates()

        # Encode Protocol if present and needed
        if "Protocol" in df_proc.columns and "Protocol_encoded" not in df_proc.columns:
            from sklearn.preprocessing import LabelEncoder
            le_proto = LabelEncoder()
            df_proc["Protocol_encoded"] = le_proto.fit_transform(
                df_proc["Protocol"].astype(str)
            )

        # ── Step 3: Batch prediction ────────────────────────────────
        X = pd.DataFrame()
        for col in predictor.feature_names:
            if col in df_proc.columns:
                X[col] = pd.to_numeric(df_proc[col], errors="coerce").fillna(0).astype(float).values
            else:
                X[col] = 0.0

        X_scaled = predictor.scaler.transform(X.values)
        pred_indices = predictor.model.predict(X_scaled)
        probabilities = predictor.model.predict_proba(X_scaled)

        # Build per-row predictions
        predictions = []
        attack_indices = []
        attack_type_counts = {}
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "NONE": 0}
        total_confidence = 0.0

        for i in range(len(X_scaled)):
            pred_idx = int(pred_indices[i])
            pred_label = predictor.label_encoder.inverse_transform([pred_idx])[0]
            conf = float(probabilities[i][pred_idx])
            severity = _compute_severity(conf, pred_label)
            is_attack = pred_label != "Benign"

            # Probabilities for significant classes
            probs_dict = {}
            for ci, p in enumerate(probabilities[i]):
                if p > 0.01:
                    cls_name = predictor.label_encoder.inverse_transform([ci])[0]
                    probs_dict[cls_name] = round(float(p), 4)

            row_pred = {
                "id": str(uuid.uuid4()),
                "flow_index": i,
                "prediction": pred_label,
                "confidence": round(conf, 4),
                "severity": severity,
                "is_attack": is_attack,
                "probabilities": probs_dict,
                "timestamp": datetime.utcnow().isoformat(),
            }
            predictions.append(row_pred)

            if is_attack:
                attack_indices.append(i)
                attack_type_counts[pred_label] = attack_type_counts.get(pred_label, 0) + 1
            total_confidence += conf
            severity_counts[severity] = severity_counts.get(severity, 0) + 1

        normal_count = total_rows - len(attack_indices)
        attack_count = len(attack_indices)
        avg_confidence = round(total_confidence / max(total_rows, 1), 4)

        # ── Step 4: SHAP explanation for attack samples ────────────
        shap_explanations = []
        if predictor.explainer is not None and attack_indices:
            sample_indices = attack_indices[:max_shap_samples]
            X_attack = X_scaled[sample_indices]

            try:
                shap_values = predictor.explainer.shap_values(X_attack)

                for si, row_idx in enumerate(sample_indices):
                    pred_idx = int(pred_indices[row_idx])
                    pred_label = predictions[row_idx]["prediction"]

                    # Extract SHAP for the predicted class
                    if isinstance(shap_values, list):
                        class_shap = shap_values[pred_idx][si]
                    elif shap_values.ndim == 3:
                        class_shap = shap_values[si, :, pred_idx]
                    else:
                        class_shap = shap_values[si]

                    feature_importance = []
                    for fi, fname in enumerate(predictor.feature_names):
                        impact = float(abs(class_shap[fi]))
                        signed = float(class_shap[fi])
                        feature_importance.append({
                            "feature": fname,
                            "impact": round(impact, 6),
                            "signed_impact": round(signed, 6),
                            "direction": "increases_attack" if signed > 0 else "decreases_attack",
                        })
                    feature_importance.sort(key=lambda x: x["impact"], reverse=True)
                    shap_explanations.append({
                        "flow_index": row_idx,
                        "prediction": pred_label,
                        "important_features": feature_importance[:10],
                    })
            except Exception as e:
                shap_explanations.append({"error": str(e)})

        # ── Step 5: Aggregate attack category details ──────────────
        attack_details = []
        for attack_type, count in sorted(attack_type_counts.items(), key=lambda x: -x[1]):
            # Compute average confidence for this attack type
            confs = [p["confidence"] for p in predictions if p["prediction"] == attack_type]
            avg_conf = round(sum(confs) / max(len(confs), 1), 4)

            # Determine severity (most common)
            sevs = [p["severity"] for p in predictions if p["prediction"] == attack_type]
            from collections import Counter
            most_common_sev = Counter(sevs).most_common(1)[0][0] if sevs else "NONE"

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

        # ── Step 6: Global SHAP summary ────────────────────────────
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

        # ── Step 7: Determine overall risk level ───────────────────
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

        # ── Sample predictions for table (first 500) ──────────────
        sample_predictions = predictions[:500]

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
            "predictions": sample_predictions,
            "total_predictions": len(predictions),
        }

    def generate_report_data(self, analysis_result: dict) -> dict:
        """
        Transform analysis result into a structured report payload
        suitable for PDF generation.
        """
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


# ── Singleton ────────────────────────────────────────────────────────────────
_engine: Optional[PredictionEngine] = None


def get_prediction_engine() -> PredictionEngine:
    """Get or create the singleton prediction engine."""
    global _engine
    if _engine is None:
        _engine = PredictionEngine()
    return _engine
