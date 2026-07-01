"""
Preprocessing Service
=====================
Data preprocessing and feature engineering.
"""

import numpy as np
import pandas as pd
from typing import List


# Columns to drop before prediction (identifiers / non-predictive)
DROP_COLS = [
    "Flow ID", "Source IP", "Destination IP", "Source IP.1",
    "Destination IP.1", "Timestamp", "Src IP", "Dst IP",
    "Source IP.2", "Destination IP.2",
]


def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Preprocess a DataFrame for prediction.

    Steps:
      1. Drop identifier columns
      2. Handle infinities and NaN
      3. Remove duplicates
      4. Encode categorical columns if needed

    Parameters
    ----------
    df : pd.DataFrame
        Raw parquet data.

    Returns
    -------
    pd.DataFrame
        Preprocessed data.
    """
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

    # Encode Protocol if present
    if "Protocol" in df_proc.columns and "Protocol_encoded" not in df_proc.columns:
        from sklearn.preprocessing import LabelEncoder
        le_proto = LabelEncoder()
        df_proc["Protocol_encoded"] = le_proto.fit_transform(
            df_proc["Protocol"].astype(str)
        )

    return df_proc


def select_features(df: pd.DataFrame, feature_names: List[str]) -> pd.DataFrame:
    """
    Select and order features for model input.

    Parameters
    ----------
    df : pd.DataFrame
        Preprocessed data.
    feature_names : List[str]
        List of feature names expected by the model.

    Returns
    -------
    pd.DataFrame
        DataFrame with only the required features, in correct order.
    """
    X = pd.DataFrame()
    for col in feature_names:
        if col in df.columns:
            X[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(float).values
        else:
            X[col] = 0.0
    return X


def validate_features(df: pd.DataFrame, feature_names: List[str]) -> dict:
    """
    Check which features are present/missing in the dataset.

    Returns
    -------
    dict with available_features, missing_features, features_count
    """
    available = [c for c in feature_names if c in df.columns]
    missing = [c for c in feature_names if c not in df.columns]
    return {
        "available_features": available,
        "missing_features": missing,
        "features_count": len(available),
    }
