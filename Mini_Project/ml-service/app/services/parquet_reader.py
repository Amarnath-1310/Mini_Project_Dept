"""
Parquet Reader Service
======================
Reads and validates .parquet dataset files.
"""

import pandas as pd
from pathlib import Path
from typing import Tuple


def read_parquet(file_path: str) -> pd.DataFrame:
    """
    Read a parquet file and return a DataFrame.

    Parameters
    ----------
    file_path : str
        Path to the parquet file.

    Returns
    -------
    pd.DataFrame
        The loaded data.

    Raises
    ------
    FileNotFoundError
        If the file does not exist.
    ValueError
        If the file is empty.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    df = pd.read_parquet(file_path)

    if len(df) == 0:
        raise ValueError("Dataset is empty")

    return df


def validate_parquet(file_path: str) -> Tuple[bool, str, dict]:
    """
    Validate a parquet file and return metadata.

    Returns
    -------
    Tuple of (is_valid, message, metadata)
    """
    try:
        df = read_parquet(file_path)
        metadata = {
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": list(df.columns),
            "file_size_bytes": Path(file_path).stat().st_size,
        }
        return True, "Valid parquet file", metadata
    except FileNotFoundError as e:
        return False, str(e), {}
    except ValueError as e:
        return False, str(e), {}
    except Exception as e:
        return False, f"Failed to read file: {str(e)}", {}


def get_dataset_summary(df: pd.DataFrame) -> dict:
    """
    Get a summary of the dataset statistics.
    """
    return {
        "total_records": len(df),
        "total_columns": len(df.columns),
        "missing_values": int(df.isnull().sum().sum()),
        "duplicate_records": int(df.duplicated().sum()),
        "column_names": list(df.columns),
        "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
    }
