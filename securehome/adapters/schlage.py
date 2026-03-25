"""Adapter for Schlage Encode smart locks via the pyschlage community library.

Requires: pip install pyschlage

Authentication uses your Schlage Home app credentials (email + password).
These are set via environment variables SCHLAGE_USERNAME and SCHLAGE_PASSWORD.
"""

from __future__ import annotations

import logging
import os

from securehome.models import (
    CameraEvent,
    Device,
    DeviceType,
    LockState,
)

from .base import DeviceAdapter

logger = logging.getLogger(__name__)


def _get_schlage_auth():
    """Authenticate with the Schlage cloud API."""
    import pyschlage

    username = os.environ.get("SCHLAGE_USERNAME", "")
    password = os.environ.get("SCHLAGE_PASSWORD", "")
    if not username or not password:
        raise ValueError(
            "SCHLAGE_USERNAME and SCHLAGE_PASSWORD environment variables are required"
        )

    return pyschlage.Schlage(username=username, password=password)


def _map_lock_state(lock) -> LockState:
    """Map a pyschlage lock's state to our LockState enum."""
    if lock.is_locked:
        return LockState.LOCKED
    if lock.is_jammed:
        return LockState.JAMMED
    return LockState.UNLOCKED


class SchlageAdapter(DeviceAdapter):
    """Controls Schlage Encode locks via the pyschlage library."""

    def __init__(self) -> None:
        self._api = _get_schlage_auth()

    def list_devices(self) -> list[Device]:
        locks = self._api.locks()
        return [self._to_device(lock) for lock in locks]

    def get_device(self, device_id: str) -> Device | None:
        for lock in self._api.locks():
            if lock.device_id == device_id:
                return self._to_device(lock)
        return None

    def lock(self, device_id: str) -> bool:
        for schlage_lock in self._api.locks():
            if schlage_lock.device_id == device_id:
                schlage_lock.lock()
                logger.info("Locked %s", schlage_lock.name)
                return True
        logger.warning("Lock %s not found", device_id)
        return False

    def unlock(self, device_id: str) -> bool:
        for schlage_lock in self._api.locks():
            if schlage_lock.device_id == device_id:
                schlage_lock.unlock()
                logger.info("Unlocked %s", schlage_lock.name)
                return True
        logger.warning("Lock %s not found", device_id)
        return False

    def get_recent_events(self, hours: int = 24) -> list[CameraEvent]:
        # Schlage locks don't produce camera events
        return []

    def get_access_logs(self, device_id: str) -> list[dict]:
        """Return the access history for a specific lock.

        Each entry contains timestamp, user, and action (lock/unlock/code used).
        This is Schlage-specific and not part of the base DeviceAdapter interface.
        """
        for schlage_lock in self._api.locks():
            if schlage_lock.device_id == device_id:
                return schlage_lock.logs()
        return []

    @staticmethod
    def _to_device(lock) -> Device:
        return Device(
            id=lock.device_id,
            name=lock.name,
            device_type=DeviceType.LOCK,
            room="",
            online=lock.is_connected if hasattr(lock, "is_connected") else True,
            lock_state=_map_lock_state(lock),
        )
