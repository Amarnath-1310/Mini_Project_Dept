"""
Clinical-NIDS: Model Training Pipeline
========================================
Loads CICIDS2017-style parquet data, preprocesses, trains RandomForest (baseline)
and XGBoost (production) models, evaluates, and saves artifacts.
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)

# XGBoost
from xgboost import XGBClassifier

# SMOTE for class imbalance
from imblearn.over_sampling import SMOTE

warnings.filterwarnings("ignore")

# ── Configuration ────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "results"
MODEL_DIR = BASE_DIR / "model"
MODEL_DIR.mkdir(exist_ok=True)

# Columns to drop (identifiers / non-predictive)
DROP_COLS = [
    "Flow ID", "Source IP", "Destination IP", "Source IP.1",
    "Destination IP.1", "Timestamp", "Src IP", "Dst IP",
    "Source IP.2", "Destination IP.2",
]

# Feature columns to keep (CICIDS2017 network flow features)
FEATURE_COLS = [
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Fwd Packets Length Total",
    "Bwd Packets Length Total",
    "Fwd Packet Length Max",
    "Fwd Packet Length Min",
    "Fwd Packet Length Mean",
    "Fwd Packet Length Std",
    "Bwd Packet Length Max",
    "Bwd Packet Length Min",
    "Bwd Packet Length Mean",
    "Bwd Packet Length Std",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Flow IAT Mean",
    "Flow IAT Std",
    "Flow IAT Max",
    "Flow IAT Min",
    "Fwd IAT Total",
    "Fwd IAT Mean",
    "Fwd IAT Std",
    "Fwd IAT Max",
    "Fwd IAT Min",
    "Bwd IAT Total",
    "Bwd IAT Mean",
    "Bwd IAT Std",
    "Bwd IAT Max",
    "Bwd IAT Min",
    "Fwd PSH Flags",
    "Bwd PSH Flags",
    "Fwd URG Flags",
    "Bwd URG Flags",
    "Fwd Header Length",
    "Bwd Header Length",
    "Fwd Packets/s",
    "Bwd Packets/s",
    "Packet Length Min",
    "Packet Length Max",
    "Packet Length Mean",
    "Packet Length Std",
    "Packet Length Variance",
    "FIN Flag Count",
    "SYN Flag Count",
    "RST Flag Count",
    "PSH Flag Count",
    "ACK Flag Count",
    "URG Flag Count",
    "CWE Flag Count",
    "ECE Flag Count",
    "Down/Up Ratio",
    "Avg Packet Size",
    "Avg Fwd Segment Size",
    "Avg Bwd Segment Size",
    "Fwd Avg Bytes/Bulk",
    "Fwd Avg Packets/Bulk",
    "Fwd Avg Bulk Rate",
    "Bwd Avg Bytes/Bulk",
    "Bwd Avg Packets/Bulk",
    "Bwd Avg Bulk Rate",
    "Subflow Fwd Packets",
    "Subflow Fwd Bytes",
    "Subflow Bwd Packets",
    "Subflow Bwd Bytes",
    "Init Fwd Win Bytes",
    "Init Bwd Win Bytes",
    "Fwd Act Data Packets",
    "Fwd Seg Size Min",
    "Active Mean",
    "Active Std",
    "Active Max",
    "Active Min",
    "Idle Mean",
    "Idle Std",
    "Idle Max",
    "Idle Min",
]

# Protocol column (encoded separately)
PROTOCOL_COL = "Protocol"

# Max rows to sample per file (to keep training manageable)
MAX_ROWS_PER_FILE = 15_000

# ── Attack type mapping ─────────────────────────────────────────────────────
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


def map_attack_label(label: str) -> str:
    """Map raw CICIDS2017 labels to simplified attack categories."""
    clean = label.encode("ascii", "replace").decode("ascii").strip()
    if clean in ATTACK_MAP:
        return ATTACK_MAP[clean]
    if "Web Attack" in clean:
        return "Web Attack"
    if "Bot" in clean:
        return "Botnet"
    return clean


# ═══════════════════════════════════════════════════════════════════════════
# Step 1 — Load & merge dataset
# ═══════════════════════════════════════════════════════════════════════════
def load_dataset() -> pd.DataFrame:
    """Read all parquet files from results/ and merge into one DataFrame."""
    print("[1/7] Loading dataset from parquet files...")
    frames = []
    for fname in sorted(DATA_DIR.glob("*.parquet")):
        print(f"      Reading {fname.name} ...")
        df = pd.read_parquet(fname)
        # Sample to keep training fast
        if len(df) > MAX_ROWS_PER_FILE:
            df = df.sample(n=MAX_ROWS_PER_FILE, random_state=42)
        frames.append(df)

    merged = pd.concat(frames, ignore_index=True)
    print(f"      Total rows loaded: {len(merged):,}")
    return merged


# ═══════════════════════════════════════════════════════════════════════════
# Step 2 — Preprocessing
# ═══════════════════════════════════════════════════════════════════════════
def preprocess(df: pd.DataFrame):
    """Clean, select features, encode, scale."""
    print("[2/7] Preprocessing...")

    # Map labels
    df["Label"] = df["Label"].apply(map_attack_label)

    # Drop identifier columns (if they exist)
    existing_drop = [c for c in DROP_COLS if c in df.columns]
    df = df.drop(columns=existing_drop, errors="ignore")

    # Handle infinities and NaNs
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df[numeric_cols] = df[numeric_cols].replace([np.inf, -np.inf], np.nan)
    df[numeric_cols] = df[numeric_cols].fillna(0)

    # Remove duplicates
    before = len(df)
    df = df.drop_duplicates()
    print(f"      Removed {before - len(df):,} duplicate rows")

    # Separate target
    y_raw = df["Label"].copy()
    X = df.drop(columns=["Label"])

    # Select available feature columns
    available_features = [c for c in FEATURE_COLS if c in X.columns]

    # Add Protocol if present
    protocol_encoded = None
    if PROTOCOL_COL in X.columns:
        le_proto = LabelEncoder()
        protocol_encoded = pd.Series(
            le_proto.fit_transform(X[PROTOCOL_COL].astype(str)),
            name="Protocol_encoded"
        )
        X = X.drop(columns=[PROTOCOL_COL])
        available_features = [c for c in available_features if c != PROTOCOL_COL]

    X = X[available_features].copy()

    if protocol_encoded is not None:
        X["Protocol_encoded"] = protocol_encoded.values

    # Encode target
    le_target = LabelEncoder()
    y = le_target.fit_transform(y_raw)

    print(f"      Features: {X.shape[1]}, Samples: {X.shape[0]:,}")
    print(f"      Classes: {list(le_target.classes_)}")

    return X, y, le_target, available_features + (["Protocol_encoded"] if protocol_encoded is not None else [])


# ═══════════════════════════════════════════════════════════════════════════
# Step 3 — Train / Test split + SMOTE
# ═══════════════════════════════════════════════════════════════════════════
def prepare_splits(X, y):
    """80/20 split + SMOTE oversampling on training set."""
    print("[3/7] Splitting data (80/20) and applying SMOTE...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # SMOTE — 'auto' oversamples minority classes to match majority
    smote = SMOTE(random_state=42, k_neighbors=3)
    X_train_res, y_train_res = smote.fit_resample(X_train_scaled, y_train)
    print(f"      Train: {X_train_res.shape[0]:,} (after SMOTE)")
    print(f"      Test:  {X_test_scaled.shape[0]:,}")

    return X_train_res, X_test_scaled, y_train_res, y_test, scaler


# ═══════════════════════════════════════════════════════════════════════════
# Step 4 — Train Models
# ═══════════════════════════════════════════════════════════════════════════
def train_random_forest(X_train, y_train):
    """Baseline model."""
    print("[4/7] Training Random Forest (baseline)...")
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=20,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced"
    )
    rf.fit(X_train, y_train)
    print("      Random Forest training complete.")
    return rf


def train_xgboost(X_train, y_train):
    """Production model."""
    print("[5/7] Training XGBoost (production model)...")
    xgb = XGBClassifier(
        n_estimators=200,
        max_depth=8,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
        eval_metric="mlogloss",
        use_label_encoder=False,
    )
    xgb.fit(X_train, y_train)
    print("      XGBoost training complete.")
    return xgb


# ═══════════════════════════════════════════════════════════════════════════
# Step 5 — Evaluate
# ═══════════════════════════════════════════════════════════════════════════
def evaluate(model, X_test, y_test, le_target, model_name="Model"):
    """Compute metrics and print report."""
    print(f"\n[6/7] Evaluating {model_name}...")
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)

    # ROC-AUC (one-vs-rest for multiclass)
    try:
        from sklearn.preprocessing import label_binarize
        classes = list(range(len(le_target.classes_)))
        y_bin = label_binarize(y_test, classes=classes)
        if y_bin.shape[1] == 1:
            # binary
            roc = roc_auc_score(y_bin, y_prob[:, 1])
        else:
            roc = roc_auc_score(y_bin, y_prob, multi_class="ovr", average="weighted")
    except Exception:
        roc = 0.0

    print(f"      Accuracy:  {acc:.4f}")
    print(f"      Precision: {prec:.4f}")
    print(f"      Recall:    {rec:.4f}")
    print(f"      F1 Score:  {f1:.4f}")
    print(f"      ROC-AUC:   {roc:.4f}")

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc, 4),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Step 6 — Save artifacts
# ═══════════════════════════════════════════════════════════════════════════
def save_artifacts(model, scaler, le_target, feature_names, metrics, model_name):
    """Save model, scaler, label encoder, and report."""
    print(f"[7/7] Saving {model_name} artifacts...")

    # Model
    model_path = MODEL_DIR / f"{model_name}_model.pkl"
    joblib.dump(model, model_path)
    print(f"      Model saved: {model_path}")

    # Scaler
    scaler_path = MODEL_DIR / "scaler.pkl"
    joblib.dump(scaler, scaler_path)
    print(f"      Scaler saved: {scaler_path}")

    # Label encoder
    le_path = MODEL_DIR / "label_encoder.pkl"
    joblib.dump(le_target, le_path)
    print(f"      Label encoder saved: {le_path}")

    # Feature names
    features_path = MODEL_DIR / "feature_names.json"
    with open(features_path, "w") as f:
        json.dump(feature_names, f, indent=2)
    print(f"      Feature names saved: {features_path}")

    # Metrics report
    report_path = MODEL_DIR / "model_report.json"
    report = {
        "model_name": model_name,
        "metrics": metrics,
        "classes": list(le_target.classes_),
        "num_features": len(feature_names),
    }
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"      Report saved: {report_path}")


# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════
def main():
    print("=" * 60)
    print("  Clinical-NIDS  —  Model Training Pipeline")
    print("=" * 60)

    # 1. Load
    df = load_dataset()

    # 2. Preprocess
    X, y, le_target, feature_names = preprocess(df)

    # 3. Split + SMOTE + Scale
    X_train, X_test, y_train, y_test, scaler = prepare_splits(X, y)

    # 4. Train Random Forest (baseline)
    rf = train_random_forest(X_train, y_train)
    rf_metrics = evaluate(rf, X_test, y_test, le_target, "Random Forest")

    # 5. Train XGBoost (production)
    xgb = train_xgboost(X_train, y_train)
    xgb_metrics = evaluate(xgb, X_test, y_test, le_target, "XGBoost")

    # 6. Select best model
    if xgb_metrics["accuracy"] >= rf_metrics["accuracy"]:
        print("\n>> XGBoost selected as production model (higher accuracy)")
        save_artifacts(xgb, scaler, le_target, feature_names, xgb_metrics, "xgboost_nids")
    else:
        print("\n>> Random Forest selected as production model (higher accuracy)")
        save_artifacts(rf, scaler, le_target, feature_names, rf_metrics, "random_forest_nids")

    # Also save the XGBoost model always (as specified in requirements)
    if xgb_metrics["accuracy"] < rf_metrics["accuracy"]:
        save_artifacts(xgb, scaler, le_target, feature_names, xgb_metrics, "xgboost_nids")

    print("\n" + "=" * 60)
    print("  Training complete! Artifacts saved to: model/")
    print("=" * 60)

    return xgb_metrics


if __name__ == "__main__":
    main()
