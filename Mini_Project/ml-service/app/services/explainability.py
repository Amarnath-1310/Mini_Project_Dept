"""
Explainability Service
======================
SHAP-based explainable AI for predictions.
"""

import sys
from pathlib import Path

# Add parent directory to path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from predict import get_predictor


def explain_prediction(features: dict, prediction: str, confidence: float) -> list:
    """
    Generate SHAP explanation for a single prediction.

    Parameters
    ----------
    features : dict
        Feature values used for prediction.
    prediction : str
        Predicted attack type.
    confidence : float
        Prediction confidence.

    Returns
    -------
    list
        Top 10 important features with SHAP values.
    """
    predictor = get_predictor()

    if predictor.explainer is None:
        return []

    try:
        # Build feature vector
        feature_vector = []
        for fname in predictor.feature_names:
            feature_vector.append(float(features.get(fname, 0.0)))

        import numpy as np
        X = np.array(feature_vector).reshape(1, -1)
        X_scaled = predictor.scaler.transform(X)

        # Get SHAP values
        shap_values = predictor.explainer.shap_values(X_scaled)

        # Extract SHAP for the predicted class
        pred_idx = predictor.label_encoder.transform([prediction])[0]
        if isinstance(shap_values, list):
            class_shap = shap_values[pred_idx][0]
        elif shap_values.ndim == 3:
            class_shap = shap_values[0, :, pred_idx]
        else:
            class_shap = shap_values[0]

        # Build feature importance list
        feature_importance = []
        for i, fname in enumerate(predictor.feature_names):
            impact = float(abs(class_shap[i]))
            signed = float(class_shap[i])
            feature_importance.append({
                "feature": fname,
                "impact": round(impact, 6),
                "signed_impact": round(signed, 6),
                "direction": "increases_attack" if signed > 0 else "decreases_attack",
            })

        # Sort by impact and return top 10
        feature_importance.sort(key=lambda x: x["impact"], reverse=True)
        return feature_importance[:10]

    except Exception as e:
        return [{"feature": "error", "impact": 0, "signed_impact": 0, "direction": str(e)}]


def get_global_feature_importance(shap_explanations: list) -> list:
    """
    Aggregate SHAP explanations into global feature importance.

    Parameters
    ----------
    shap_explanations : list
        List of SHAP explanation dicts from multiple predictions.

    Returns
    -------
    list
        Top 10 globally important features.
    """
    if not shap_explanations:
        return []

    all_impacts = {}
    for explanation in shap_explanations:
        for f in explanation.get("important_features", []):
            fname = f["feature"]
            all_impacts[fname] = all_impacts.get(fname, 0) + f["impact"]

    sorted_features = sorted(all_impacts.items(), key=lambda x: -x[1])[:10]

    result = []
    for fname, imp in sorted_features:
        level = "HIGH" if imp > 1.0 else "MEDIUM" if imp > 0.2 else "LOW"
        result.append({
            "name": fname,
            "impact": round(imp, 4),
            "level": level,
        })

    return result
