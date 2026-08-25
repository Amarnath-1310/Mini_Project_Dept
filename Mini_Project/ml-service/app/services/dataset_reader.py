"""
Dataset Reader Service
======================
Universal file reader that supports multiple dataset formats.
Auto-detects file type by extension and reads accordingly.
"""

import pandas as pd
from pathlib import Path
from typing import Tuple

SUPPORTED_EXTENSIONS = {
    ".parquet", ".csv", ".tsv", ".xlsx", ".xls", ".feather", ".txt",
}


def read_dataset(file_path: str) -> pd.DataFrame:
    """
    Read a dataset file and return a DataFrame.
    Auto-detects format from file extension.

    Supported formats: .parquet, .csv, .tsv, .xlsx, .xls, .feather, .txt

    Parameters
    ----------
    file_path : str
        Path to the dataset file.

    Returns
    -------
    pd.DataFrame
        The loaded data.

    Raises
    ------
    FileNotFoundError
        If the file does not exist.
    ValueError
        If the file is empty or format is unsupported.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file format '{ext}'. "
            f"Supported formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    df = _read_by_extension(path, ext)

    if len(df) == 0:
        raise ValueError("Dataset is empty (0 rows)")

    return df


def _read_by_extension(path: Path, ext: str) -> pd.DataFrame:
    """Read file based on its extension."""
    if ext == ".parquet":
        return pd.read_parquet(path)
    elif ext == ".csv" or ext == ".txt":
        return pd.read_csv(path, low_memory=False)
    elif ext == ".tsv":
        return pd.read_csv(path, sep="\t", low_memory=False)
    elif ext in (".xlsx", ".xls"):
        return pd.read_excel(path, engine="openpyxl" if ext == ".xlsx" else None)
    elif ext == ".feather":
        return pd.read_feather(path)
    else:
        raise ValueError(f"No reader implemented for extension: {ext}")


def detect_file_type(filename: str) -> str:
    """Detect file type from filename extension."""
    ext = Path(filename).suffix.lower()
    type_map = {
        ".parquet": "parquet",
        ".csv": "csv",
        ".tsv": "tsv",
        ".xlsx": "excel",
        ".xls": "excel",
        ".feather": "feather",
        ".txt": "text",
    }
    return type_map.get(ext, "unknown")


def validate_dataset(file_path: str) -> Tuple[bool, str, dict]:
    """
    Validate a dataset file and return metadata.

    Returns
    -------
    Tuple of (is_valid, message, metadata)
    """
    try:
        df = read_dataset(file_path)
        metadata = {
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": list(df.columns),
            "file_size_bytes": Path(file_path).stat().st_size,
            "file_type": detect_file_type(file_path),
        }
        return True, "Valid dataset file", metadata
    except FileNotFoundError as e:
        return False, str(e), {}
    except ValueError as e:
        return False, str(e), {}
    except Exception as e:
        return False, f"Failed to read file: {str(e)}", {}


def get_dataset_summary(df: pd.DataFrame) -> dict:
    """Get a summary of the dataset statistics."""
    return {
        "total_records": len(df),
        "total_columns": len(df.columns),
        "missing_values": int(df.isnull().sum().sum()),
        "duplicate_records": int(df.duplicated().sum()),
        "column_names": list(df.columns),
        "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
    }
