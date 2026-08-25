"""
MedSentry-XAI: Live Traffic REST Endpoints
==========================================
Provides interfaces for host interface discovery, starting/stopping live capture,
retrieving real-time flows, and live threat telemetry.
"""

from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.services.live_traffic_capture import LiveTrafficManager, get_network_interfaces

router = APIRouter(prefix="/api/live-traffic", tags=["live-traffic"])


class StartCaptureRequest(BaseModel):
    interface: Optional[str] = None
    mode: Optional[str] = "auto"
    auto_ingest: Optional[bool] = True


@router.get("/interfaces")
def list_interfaces():
    """List available network interfaces on the host."""
    interfaces = get_network_interfaces()
    return {"interfaces": interfaces, "count": len(interfaces)}


@router.post("/start")
def start_live_capture(req: StartCaptureRequest = StartCaptureRequest()):
    """Start capturing and analyzing live network traffic."""
    manager = LiveTrafficManager.get_instance()
    result = manager.start(
        interface=req.interface,
        mode=req.mode or "auto",
        auto_ingest=req.auto_ingest if req.auto_ingest is not None else True
    )
    return result


@router.post("/stop")
def stop_live_capture():
    """Stop live network traffic capture."""
    manager = LiveTrafficManager.get_instance()
    result = manager.stop()
    return result


@router.get("/status")
def live_traffic_status():
    """Get current status of live traffic capture."""
    manager = LiveTrafficManager.get_instance()
    return manager.get_status()


@router.get("/flows")
def get_live_flows(limit: int = 50, since_id: int = 0):
    """Get recent live analyzed flows with predictions and XAI explanations."""
    manager = LiveTrafficManager.get_instance()
    return manager.get_recent_flows(limit=limit, since_id=since_id)
