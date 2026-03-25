"""Adapter for TP-Link Kasa / Tapo devices via the python-kasa library.

Requires: pip install python-kasa

Kasa devices are discovered and controlled on the local network.
Newer devices require authentication — set KASA_USERNAME and KASA_PASSWORD
environment variables (your TP-Link / Kasa app credentials).
"""

from __future__ import annotations

import asyncio
import logging
import os
from functools import wraps
from typing import Any

from securehome.models import (
    CameraEvent,
    Device,
    DeviceType,
    DoorState,
    LockState,
)

from .base import DeviceAdapter

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run an async coroutine synchronously, reusing an existing event loop if available."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # We're inside an async context — create a new thread to avoid deadlock
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)


def _get_credentials() -> dict[str, str] | None:
    """Return Kasa credentials if set."""
    username = os.environ.get("KASA_USERNAME", "")
    password = os.environ.get("KASA_PASSWORD", "")
    if username and password:
        return {"username": username, "password": password}
    return None


# Map python-kasa device types to our DeviceType
def _map_device_type(dev) -> DeviceType:
    """Infer our DeviceType from a python-kasa device object."""
    from kasa import DeviceType as KasaType

    type_map = {
        KasaType.Plug: DeviceType.OTHER,
        KasaType.Bulb: DeviceType.LIGHT,
        KasaType.Strip: DeviceType.LIGHT,
        KasaType.LightStrip: DeviceType.LIGHT,
        KasaType.Dimmer: DeviceType.LIGHT,
        KasaType.Camera: DeviceType.CAMERA,
        KasaType.Hub: DeviceType.OTHER,
        KasaType.Sensor: DeviceType.SENSOR,
        KasaType.Thermostat: DeviceType.THERMOSTAT,
    }
    return type_map.get(dev.device_type, DeviceType.OTHER)


class KasaAdapter(DeviceAdapter):
    """Discovers and controls TP-Link Kasa/Tapo devices on the local network."""

    def __init__(self, target: str | None = None) -> None:
        """
        Args:
            target: Optional IP or network (e.g. "192.168.1.0/24"). If None,
                    discovers on the default broadcast address.
        """
        self._target = target
        self._credentials = _get_credentials()
        self._devices_cache: dict[str, Any] = {}

    async def _discover(self) -> dict[str, Any]:
        from kasa import Credentials, Discover

        creds = Credentials(**self._credentials) if self._credentials else None
        kwargs: dict[str, Any] = {}
        if creds:
            kwargs["credentials"] = creds
        if self._target:
            kwargs["target"] = self._target

        discovered = await Discover.discover(**kwargs)
        self._devices_cache = {addr: dev for addr, dev in discovered.items()}
        return self._devices_cache

    async def _get_or_connect(self, device_id: str) -> Any | None:
        """Find a device by IP or alias. Updates its state."""
        if not self._devices_cache:
            await self._discover()

        dev = self._devices_cache.get(device_id)
        if dev is None:
            # Try matching by alias
            for d in self._devices_cache.values():
                if d.alias == device_id:
                    dev = d
                    break
        if dev:
            await dev.update()
        return dev

    # ---- DeviceAdapter interface ----

    def list_devices(self) -> list[Device]:
        devices = _run_async(self._discover())
        result: list[Device] = []
        for addr, dev in devices.items():
            _run_async(dev.update())
            result.append(self._to_device(addr, dev))
        return result

    def get_device(self, device_id: str) -> Device | None:
        dev = _run_async(self._get_or_connect(device_id))
        if dev is None:
            return None
        addr = device_id if device_id in self._devices_cache else ""
        return self._to_device(addr or device_id, dev)

    def lock(self, device_id: str) -> bool:
        # Kasa doesn't have locks
        logger.warning("Kasa adapter does not support lock commands")
        return False

    def unlock(self, device_id: str) -> bool:
        logger.warning("Kasa adapter does not support unlock commands")
        return False

    def get_recent_events(self, hours: int = 24) -> list[CameraEvent]:
        # Kasa camera events would require RTSP/ONVIF — not supported via python-kasa
        return []

    # ---- Kasa-specific operations ----

    def turn_on(self, device_id: str) -> bool:
        """Turn on a plug, switch, or light."""
        dev = _run_async(self._get_or_connect(device_id))
        if dev is None:
            return False
        _run_async(dev.turn_on())
        logger.info("Turned on %s", dev.alias)
        return True

    def turn_off(self, device_id: str) -> bool:
        """Turn off a plug, switch, or light."""
        dev = _run_async(self._get_or_connect(device_id))
        if dev is None:
            return False
        _run_async(dev.turn_off())
        logger.info("Turned off %s", dev.alias)
        return True

    def set_brightness(self, device_id: str, brightness: int) -> bool:
        """Set brightness (0-100) for dimmable devices."""
        dev = _run_async(self._get_or_connect(device_id))
        if dev is None or not hasattr(dev, "set_brightness"):
            return False
        _run_async(dev.set_brightness(brightness))
        return True

    def get_energy_usage(self, device_id: str) -> dict | None:
        """Get real-time energy usage from a power-monitoring plug."""
        dev = _run_async(self._get_or_connect(device_id))
        if dev is None:
            return None
        if hasattr(dev, "emeter_realtime"):
            return _run_async(dev.get_emeter_realtime())
        return None

    # ---- parsing ----

    @staticmethod
    def _to_device(addr: str, dev) -> Device:
        return Device(
            id=addr,
            name=dev.alias or addr,
            device_type=_map_device_type(dev),
            room="",
            online=dev.is_on is not None,  # if we can read state, it's online
            raw_traits={
                "model": dev.model if hasattr(dev, "model") else "",
                "is_on": dev.is_on,
                "hw_info": str(dev.hw_info) if hasattr(dev, "hw_info") else "",
            },
        )
