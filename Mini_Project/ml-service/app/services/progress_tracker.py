"""
Progress Tracker Service
========================
Thread-safe progress tracking for dataset analysis operations.
Provides step-by-step status updates for the frontend.
"""

import threading
import time
from typing import Optional


# Thread-safe progress store
_progress_store: dict = {}
_lock = threading.Lock()


# Define the standard analysis steps
ANALYSIS_STEPS = [
    "File uploaded",
    "Validating dataset...",
    "Reading dataset...",
    "Detecting supported columns...",
    "Cleaning missing values...",
    "Removing duplicate rows...",
    "Feature preprocessing...",
    "Loading trained model...",
    "Running prediction...",
    "Generating Explainable AI results...",
    "Calculating statistics...",
    "Saving results...",
]


def init_progress(dataset_id: str) -> None:
    """Initialize progress tracking for a dataset."""
    with _lock:
        _progress_store[dataset_id] = {
            "dataset_id": dataset_id,
            "steps": [
                {"name": step, "status": "pending"}
                for step in ANALYSIS_STEPS
            ],
            "progress_percent": 0,
            "rows_processed": 0,
            "total_rows": 0,
            "speed_rows_per_sec": 0,
            "estimated_seconds_remaining": 0,
            "current_status": "File uploaded",
            "status": "started",
            "started_at": time.time(),
            "error": None,
        }
        # Mark first step as completed
        _progress_store[dataset_id]["steps"][0]["status"] = "completed"


def update_step(dataset_id: str, step_name: str, status: str = "completed") -> None:
    """Update the status of a specific step."""
    with _lock:
        if dataset_id not in _progress_store:
            return
        prog = _progress_store[dataset_id]
        for step in prog["steps"]:
            if step["name"] == step_name:
                step["status"] = status
                break
        # Update current status
        prog["current_status"] = step_name
        # Calculate progress percentage
        completed = sum(1 for s in prog["steps"] if s["status"] == "completed")
        total = len(prog["steps"])
        prog["progress_percent"] = round((completed / total) * 100)


def update_progress(dataset_id: str, **kwargs) -> None:
    """Update progress metrics."""
    with _lock:
        if dataset_id not in _progress_store:
            return
        prog = _progress_store[dataset_id]
        for key, value in kwargs.items():
            if key in prog:
                prog[key] = value


def set_completed(dataset_id: str) -> None:
    """Mark analysis as completed."""
    with _lock:
        if dataset_id not in _progress_store:
            return
        prog = _progress_store[dataset_id]
        for step in prog["steps"]:
            step["status"] = "completed"
        prog["progress_percent"] = 100
        prog["current_status"] = "Analysis Completed"
        prog["status"] = "completed"
        prog["rows_processed"] = prog["total_rows"]


def set_failed(dataset_id: str, error: str) -> None:
    """Mark analysis as failed."""
    with _lock:
        if dataset_id not in _progress_store:
            return
        prog = _progress_store[dataset_id]
        prog["status"] = "failed"
        prog["error"] = error
        prog["current_status"] = f"Failed: {error}"


def get_progress(dataset_id: str) -> Optional[dict]:
    """Get current progress for a dataset."""
    with _lock:
        prog = _progress_store.get(dataset_id)
        if prog is None:
            return None
        # Calculate estimated time remaining
        elapsed = time.time() - prog["started_at"]
        pct = prog["progress_percent"]
        if pct > 0 and pct < 100:
            total_estimated = elapsed / (pct / 100.0)
            remaining = max(0, int(total_estimated - elapsed))
        else:
            remaining = 0

        # Calculate speed
        rows_done = prog["rows_processed"]
        speed = int(rows_done / max(elapsed, 0.1)) if elapsed > 0 else 0

        return {
            "dataset_id": dataset_id,
            "steps": prog["steps"],
            "progress_percent": prog["progress_percent"],
            "rows_processed": prog["rows_processed"],
            "total_rows": prog["total_rows"],
            "speed_rows_per_sec": speed,
            "estimated_seconds_remaining": remaining,
            "current_status": prog["current_status"],
            "status": prog["status"],
            "error": prog["error"],
        }


def cleanup_progress(dataset_id: str) -> None:
    """Remove progress data for a dataset (call after result is fetched)."""
    with _lock:
        _progress_store.pop(dataset_id, None)
