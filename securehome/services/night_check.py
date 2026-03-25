"""Night check service — scans all locks and doors and reports anything insecure."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from securehome.adapters.base import DeviceAdapter
from securehome.models import (
    Device,
    DeviceType,
    DoorState,
    LockState,
    NightCheckResult,
)

logger = logging.getLogger(__name__)


def run_night_check(adapters: list[DeviceAdapter]) -> NightCheckResult:
    """Query all adapters for lock/door devices and flag any that are not secure."""
    all_devices: list[Device] = []
    for adapter in adapters:
        try:
            all_devices.extend(adapter.list_devices())
        except Exception:
            logger.exception("Failed to list devices from %s", type(adapter).__name__)

    unlocked: list[Device] = []
    open_doors: list[Device] = []

    for dev in all_devices:
        if dev.device_type == DeviceType.LOCK and dev.lock_state != LockState.LOCKED:
            unlocked.append(dev)

        if dev.device_type in (DeviceType.DOOR, DeviceType.OTHER):
            if dev.door_state == DoorState.OPEN or dev.open_percent > 0:
                open_doors.append(dev)

    all_secure = len(unlocked) == 0 and len(open_doors) == 0

    result = NightCheckResult(
        checked_at=datetime.now(timezone.utc),
        all_secure=all_secure,
        unlocked_locks=unlocked,
        open_doors=open_doors,
    )

    if all_secure:
        logger.info("Night check PASSED — all locks and doors secure")
    else:
        logger.warning(
            "Night check FAILED — %d unlocked lock(s), %d open door(s)",
            len(unlocked),
            len(open_doors),
        )

    return result
