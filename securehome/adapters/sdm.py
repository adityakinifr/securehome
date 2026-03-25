"""Adapter for the Google Smart Device Management (SDM) API — covers Nest devices."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import httpx

from securehome.auth import get_credentials
from securehome.config import settings
from securehome.models import (
    CameraEvent,
    Device,
    DeviceType,
    DoorState,
    EventType,
    LockState,
)

from .base import DeviceAdapter

logger = logging.getLogger(__name__)

# SDM type → our DeviceType
_TYPE_MAP: dict[str, DeviceType] = {
    "sdm.devices.types.CAMERA": DeviceType.CAMERA,
    "sdm.devices.types.DOORBELL": DeviceType.DOORBELL,
    "sdm.devices.types.THERMOSTAT": DeviceType.THERMOSTAT,
    "sdm.devices.types.DISPLAY": DeviceType.OTHER,
}


class SDMAdapter(DeviceAdapter):
    """Reads device state from the Google SDM API (Nest ecosystem)."""

    def __init__(self) -> None:
        self._base = settings.sdm_base_url

    # ---- helpers ----

    def _headers(self) -> dict[str, str]:
        creds = get_credentials()
        return {"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json"}

    def _get(self, path: str) -> dict:
        url = f"{self._base}{path}"
        resp = httpx.get(url, headers=self._headers(), timeout=30)
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, body: dict) -> dict:
        url = f"{self._base}{path}"
        resp = httpx.post(url, headers=self._headers(), json=body, timeout=30)
        resp.raise_for_status()
        return resp.json()

    # ---- DeviceAdapter interface ----

    def list_devices(self) -> list[Device]:
        data = self._get("/devices")
        devices: list[Device] = []
        for raw in data.get("devices", []):
            devices.append(self._parse_device(raw))
        return devices

    def get_device(self, device_id: str) -> Device | None:
        try:
            raw = self._get(f"/devices/{device_id}")
            return self._parse_device(raw)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                return None
            raise

    def lock(self, device_id: str) -> bool:
        # SDM doesn't natively support locks; placeholder for future adapters
        logger.warning("SDM adapter does not support lock commands (Nest has no locks)")
        return False

    def unlock(self, device_id: str) -> bool:
        logger.warning("SDM adapter does not support unlock commands (Nest has no locks)")
        return False

    def get_recent_events(self, hours: int = 24) -> list[CameraEvent]:
        """Camera events come via Pub/Sub, not a REST list endpoint.

        This method returns an empty list — the EventListener service
        collects events in real-time and stores them in the EventStore.
        """
        return []

    def generate_event_image(self, device_id: str, event_id: str) -> str:
        """Fetch a snapshot URL for a camera event."""
        body = {
            "command": "sdm.devices.commands.CameraEventImage.GenerateImage",
            "params": {"eventId": event_id},
        }
        result = self._post(f"/devices/{device_id}:executeCommand", body)
        return result.get("results", {}).get("url", "")

    def get_camera_stream(self, device_id: str) -> str:
        """Request an RTSP live-stream URL."""
        body = {
            "command": "sdm.devices.commands.CameraLiveStream.GenerateRtspStream",
            "params": {},
        }
        result = self._post(f"/devices/{device_id}:executeCommand", body)
        return result.get("results", {}).get("streamUrls", {}).get("rtspUrl", "")

    # ---- parsing ----

    @staticmethod
    def _parse_device(raw: dict) -> Device:
        name_path: str = raw.get("name", "")
        device_id = name_path.rsplit("/", 1)[-1] if "/" in name_path else name_path
        sdm_type = raw.get("type", "")
        traits = raw.get("traits", {})

        # Friendly name from parent relation
        display_name = ""
        room = ""
        for rel in raw.get("parentRelations", []):
            display_name = rel.get("displayName", "")
            room = display_name

        device_type = _TYPE_MAP.get(sdm_type, DeviceType.OTHER)
        online = traits.get("sdm.devices.traits.Connectivity", {}).get("status") == "ONLINE"

        # OpenClose (e.g., garage door)
        open_pct = traits.get("sdm.devices.traits.OpenClose", {}).get("openPercent", 0.0)
        door_state = DoorState.OPEN if open_pct > 0 else DoorState.CLOSED

        return Device(
            id=device_id,
            name=display_name or device_id,
            device_type=device_type,
            room=room,
            online=online,
            raw_traits=traits,
            door_state=door_state,
            open_percent=open_pct,
        )
