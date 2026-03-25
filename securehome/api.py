"""FastAPI REST backend for the SecureHome iOS app."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from securehome.adapters.base import DeviceAdapter
from securehome.config import settings
from securehome.models import Device, NightCheckResult, VisitorSummary
from securehome.services.night_check import run_night_check
from securehome.services.visitor_summary import generate_visitor_summary

logger = logging.getLogger(__name__)

# Shared adapter list, initialized at startup
_adapters: list[DeviceAdapter] = []


def _build_adapters() -> list[DeviceAdapter]:
    names = [a.strip() for a in settings.adapters.split(",") if a.strip()]
    adapters: list[DeviceAdapter] = []
    for name in names:
        try:
            if name == "sdm":
                from securehome.adapters.sdm import SDMAdapter
                adapters.append(SDMAdapter())
            elif name == "schlage":
                from securehome.adapters.schlage import SchlageAdapter
                adapters.append(SchlageAdapter())
            elif name == "kasa":
                from securehome.adapters.kasa import KasaAdapter
                adapters.append(KasaAdapter(target=settings.kasa_target or None))
        except Exception:
            logger.exception("Failed to initialize %s adapter", name)
    return adapters


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _adapters
    _adapters = _build_adapters()
    logger.info("API started with adapters: %s", [type(a).__name__ for a in _adapters])
    yield


app = FastAPI(title="SecureHome API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Endpoints ----------


@app.get("/api/devices", response_model=list[Device])
def list_devices():
    """List all devices across all adapters."""
    devices: list[Device] = []
    for adapter in _adapters:
        try:
            devices.extend(adapter.list_devices())
        except Exception:
            logger.exception("Failed to list devices from %s", type(adapter).__name__)
    return devices


@app.get("/api/devices/{device_id}", response_model=Device)
def get_device(device_id: str):
    """Get a single device by ID."""
    for adapter in _adapters:
        dev = adapter.get_device(device_id)
        if dev:
            return dev
    raise HTTPException(status_code=404, detail="Device not found")


@app.post("/api/devices/{device_id}/lock")
def lock_device(device_id: str):
    """Lock a lock device."""
    for adapter in _adapters:
        if adapter.lock(device_id):
            return {"status": "locked", "device_id": device_id}
    raise HTTPException(status_code=404, detail="Device not found or lock not supported")


@app.post("/api/devices/{device_id}/unlock")
def unlock_device(device_id: str):
    """Unlock a lock device."""
    for adapter in _adapters:
        if adapter.unlock(device_id):
            return {"status": "unlocked", "device_id": device_id}
    raise HTTPException(status_code=404, detail="Device not found or unlock not supported")


@app.post("/api/devices/{device_id}/on")
def turn_on(device_id: str):
    """Turn on a Kasa device."""
    for adapter in _adapters:
        if hasattr(adapter, "turn_on") and adapter.turn_on(device_id):
            return {"status": "on", "device_id": device_id}
    raise HTTPException(status_code=404, detail="Device not found or turn_on not supported")


@app.post("/api/devices/{device_id}/off")
def turn_off(device_id: str):
    """Turn off a Kasa device."""
    for adapter in _adapters:
        if hasattr(adapter, "turn_off") and adapter.turn_off(device_id):
            return {"status": "off", "device_id": device_id}
    raise HTTPException(status_code=404, detail="Device not found or turn_off not supported")


@app.get("/api/night-check", response_model=NightCheckResult)
def night_check():
    """Run a night security check and return the result."""
    return run_night_check(_adapters)


@app.post("/api/night-check/lock-all")
def night_check_lock_all():
    """Run night check and auto-lock any unlocked locks."""
    result = run_night_check(_adapters)
    locked: list[str] = []
    for lock_dev in result.unlocked_locks:
        for adapter in _adapters:
            if adapter.lock(lock_dev.id):
                locked.append(lock_dev.name)
                break
    return {"result": result, "auto_locked": locked}


@app.get("/api/summary", response_model=VisitorSummary)
def visitor_summary():
    """Get today's visitor summary."""
    return generate_visitor_summary()


@app.get("/api/lock-history/{device_id}")
def lock_history(device_id: str):
    """Get Schlage lock access history."""
    for adapter in _adapters:
        if hasattr(adapter, "get_access_logs"):
            logs = adapter.get_access_logs(device_id)
            if logs:
                return {"device_id": device_id, "logs": logs}
    raise HTTPException(status_code=404, detail="No lock history available")


@app.get("/api/energy/{device_id}")
def energy_usage(device_id: str):
    """Get Kasa device energy usage."""
    for adapter in _adapters:
        if hasattr(adapter, "get_energy_usage"):
            usage = adapter.get_energy_usage(device_id)
            if usage:
                return {"device_id": device_id, "usage": usage}
    raise HTTPException(status_code=404, detail="No energy data available")


@app.get("/api/health")
def health():
    """Health check."""
    return {
        "status": "ok",
        "adapters": [type(a).__name__ for a in _adapters],
    }
