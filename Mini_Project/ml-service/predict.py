"""
Clinical-NIDS: Prediction Module
=================================
Loads trained model artifacts and provides prediction + SHAP explanation.
"""

import json
import numpy as np
import joblib
import shap
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"


class NIDSPredictor:
    """Loads the trained XGBoost model and provides predictions with SHAP explanations."""

    def __init__(self):
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.feature_names = None
        self.explainer = None
        self._loaded = False

    def load(self):
        """Load all model artifacts into memory."""
        # Find model file
        model_path = MODEL_DIR / "xgboost_nids_model.pkl"
        if not model_path.exists():
            # Fallback to any model
            models = list(MODEL_DIR.glob("*_model.pkl"))
            if not models:
                raise FileNotFoundError("No trained model found in model/")
            model_path = models[0]

        self.model = joblib.load(model_path)
        self.scaler = joblib.load(MODEL_DIR / "scaler.pkl")
        self.label_encoder = joblib.load(MODEL_DIR / "label_encoder.pkl")

        with open(MODEL_DIR / "feature_names.json") as f:
            self.feature_names = json.load(f)

        # Initialize SHAP explainer
        try:
            if hasattr(self.model, "get_booster"):
                # XGBoost model
                self.explainer = shap.TreeExplainer(self.model)
            else:
                # RandomForest or other
                self.explainer = shap.TreeExplainer(self.model)
        except Exception:
            self.explainer = None

        self._loaded = True
        print(f"Model loaded: {model_path.name}")
        print(f"Features: {len(self.feature_names)}, Classes: {list(self.label_encoder.classes_)}")

    def predict(self, features: dict) -> dict:
        """
        Predict attack type from network flow features.

        Parameters
        ----------
        features : dict
            Dictionary of feature_name -> value

        Returns
        -------
        dict with prediction, confidence, severity, and SHAP explanation
        """
        if not self._loaded:
            self.load()

        # Build feature vector in correct order
        feature_vector = []
        for fname in self.feature_names:
            feature_vector.append(float(features.get(fname, 0.0)))

        X = np.array(feature_vector).reshape(1, -1)

        # Scale
        X_scaled = self.scaler.transform(X)

        # Predict
        pred_idx = int(self.model.predict(X_scaled)[0])
        pred_label = self.label_encoder.inverse_transform([pred_idx])[0]
        probabilities = self.model.predict_proba(X_scaled)[0]
        confidence = float(probabilities[pred_idx])

        # Determine severity
        severity = self._compute_severity(confidence, pred_label)

        # SHAP explanation
        explanation = self._explain(X_scaled, pred_label, pred_idx, probabilities)

        return {
            "prediction": pred_label,
            "confidence": round(confidence, 4),
            "severity": severity,
            "is_attack": pred_label != "Benign",
            "explanation": explanation,
            "probabilities": {
                self.label_encoder.inverse_transform([i])[0]: round(float(p), 4)
                for i, p in enumerate(probabilities)
                if p > 0.01  # Only show significant probabilities
            },
        }

    def predict_batch(self, features_list: list[dict]) -> list[dict]:
        """Predict multiple samples at once."""
        return [self.predict(f) for f in features_list]

    def _compute_severity(self, confidence: float, label: str) -> str:
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

    def _explain(self, X_scaled, pred_label, pred_idx, probabilities) -> list[dict]:
        """Generate SHAP-based feature importance explanation."""
        if self.explainer is None:
            return []

        try:
            shap_values = self.explainer.shap_values(X_scaled)

            # For multiclass, shap_values is a list (one per class)
            if isinstance(shap_values, list):
                class_shap = shap_values[pred_idx][0]
            elif shap_values.ndim == 3:
                class_shap = shap_values[0, :, pred_idx]
            else:
                class_shap = shap_values[0]

            # Get absolute impact and sort
            feature_importance = []
            for i, fname in enumerate(self.feature_names):
                impact = float(abs(class_shap[i]))
                signed_impact = float(class_shap[i])
                feature_importance.append({
                    "feature": fname,
                    "impact": round(impact, 6),
                    "signed_impact": round(signed_impact, 6),
                    "direction": "increases_attack" if signed_impact > 0 else "decreases_attack",
                })

            # Sort by absolute impact descending
            feature_importance.sort(key=lambda x: x["impact"], reverse=True)

            # Return top 10
            return feature_importance[:10]

        except Exception as e:
            return [{"feature": "error", "impact": 0, "signed_impact": 0, "direction": str(e)}]


# Singleton instance
_predictor = None


def get_predictor() -> NIDSPredictor:
    """Get or create the singleton predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = NIDSPredictor()
        _predictor.load()
    return _predictor
