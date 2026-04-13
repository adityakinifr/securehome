"""Abstract base class for device adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod

from securehome.models import CameraEvent, Device


class DeviceAdapter(ABC):
    """Interface that every smart-home backend must implement."""

    @abstractmethod
    def list_devices(self) -> list[Device]:
        """Return all devices visible to this adapter."""

    @abstractmethod
    def get_device(self, device_id: str) -> Device | None:
        """Return a single device by ID."""

    @abstractmethod
    def lock(self, device_id: str) -> bool:
        """Lock a lock device. Returns True on success."""

    @abstractmethod
    def unlock(self, device_id: str) -> bool:
        """Unlock a lock device. Returns True on success."""

    @abstractmethod
    def get_recent_events(self, hours: int = 24) -> list[CameraEvent]:
        """Return camera/doorbell events from the last N hours."""
