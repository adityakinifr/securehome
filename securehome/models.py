"""Domain models for devices, events, and summaries."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# ---------- Device types ----------


class DeviceType(str, Enum):
    LOCK = "LOCK"
    CAMERA = "CAMERA"
    DOORBELL = "DOORBELL"
    THERMOSTAT = "THERMOSTAT"
    LIGHT = "LIGHT"
    SENSOR = "SENSOR"
    DOOR = "DOOR"
    OTHER = "OTHER"


class LockState(str, Enum):
    LOCKED = "LOCKED"
    UNLOCKED = "UNLOCKED"
    JAMMED = "JAMMED"
    UNKNOWN = "UNKNOWN"


class DoorState(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    UNKNOWN = "UNKNOWN"


class Device(BaseModel):
    id: str
    name: str
    device_type: DeviceType
    room: str = ""
    online: bool = True
    raw_traits: dict = Field(default_factory=dict)

    # Lock-specific
    lock_state: LockState = LockState.UNKNOWN

    # Door/OpenClose-specific
    door_state: DoorState = DoorState.UNKNOWN
    open_percent: float = 0.0


# ---------- Events ----------


class EventType(str, Enum):
    PERSON = "PERSON"
    MOTION = "MOTION"
    SOUND = "SOUND"
    DOORBELL = "DOORBELL"


class CameraEvent(BaseModel):
    device_id: str
    device_name: str = ""
    event_type: EventType
    timestamp: datetime
    event_id: str = ""
    image_url: str = ""


# ---------- Summaries ----------


class NightCheckResult(BaseModel):
    checked_at: datetime
    all_secure: bool
    unlocked_locks: list[Device] = Field(default_factory=list)
    open_doors: list[Device] = Field(default_factory=list)


class VisitorSummary(BaseModel):
    date: str
    total_person_events: int = 0
    total_doorbell_presses: int = 0
    total_motion_events: int = 0
    events: list[CameraEvent] = Field(default_factory=list)
