"""Tests for the Schlage adapter (mocked — does not require pyschlage installed)."""

from unittest.mock import MagicMock, patch

from securehome.models import Device, DeviceType, LockState


class FakeLock:
    def __init__(self, device_id, name, is_locked=True, is_jammed=False, is_connected=True):
        self.device_id = device_id
        self.name = name
        self.is_locked = is_locked
        self.is_jammed = is_jammed
        self.is_connected = is_connected

    def lock(self):
        self.is_locked = True

    def unlock(self):
        self.is_locked = False

    def logs(self):
        return [{"action": "lock", "timestamp": "2025-01-01T10:00:00Z", "user": "owner"}]


def test_map_lock_state_locked():
    from securehome.adapters.schlage import _map_lock_state

    lock = FakeLock("id1", "Front Door", is_locked=True)
    assert _map_lock_state(lock) == LockState.LOCKED


def test_map_lock_state_unlocked():
    from securehome.adapters.schlage import _map_lock_state

    lock = FakeLock("id1", "Front Door", is_locked=False)
    assert _map_lock_state(lock) == LockState.UNLOCKED


def test_map_lock_state_jammed():
    from securehome.adapters.schlage import _map_lock_state

    lock = FakeLock("id1", "Front Door", is_locked=False, is_jammed=True)
    assert _map_lock_state(lock) == LockState.JAMMED


def test_to_device():
    from securehome.adapters.schlage import SchlageAdapter

    lock = FakeLock("lock-abc", "Back Door", is_locked=True, is_connected=True)
    device = SchlageAdapter._to_device(lock)
    assert device.id == "lock-abc"
    assert device.name == "Back Door"
    assert device.device_type == DeviceType.LOCK
    assert device.lock_state == LockState.LOCKED
    assert device.online is True


def test_list_devices():
    from securehome.adapters.schlage import SchlageAdapter

    fake_api = MagicMock()
    fake_api.locks.return_value = [
        FakeLock("l1", "Front", is_locked=True),
        FakeLock("l2", "Back", is_locked=False),
    ]

    adapter = SchlageAdapter.__new__(SchlageAdapter)
    adapter._api = fake_api

    devices = adapter.list_devices()
    assert len(devices) == 2
    assert devices[0].lock_state == LockState.LOCKED
    assert devices[1].lock_state == LockState.UNLOCKED


def test_lock_device():
    from securehome.adapters.schlage import SchlageAdapter

    fake_lock = FakeLock("l1", "Front", is_locked=False)
    fake_api = MagicMock()
    fake_api.locks.return_value = [fake_lock]

    adapter = SchlageAdapter.__new__(SchlageAdapter)
    adapter._api = fake_api

    result = adapter.lock("l1")
    assert result is True


def test_lock_not_found():
    from securehome.adapters.schlage import SchlageAdapter

    fake_api = MagicMock()
    fake_api.locks.return_value = []

    adapter = SchlageAdapter.__new__(SchlageAdapter)
    adapter._api = fake_api

    result = adapter.lock("nonexistent")
    assert result is False


def test_get_access_logs():
    from securehome.adapters.schlage import SchlageAdapter

    fake_lock = FakeLock("l1", "Front")
    fake_api = MagicMock()
    fake_api.locks.return_value = [fake_lock]

    adapter = SchlageAdapter.__new__(SchlageAdapter)
    adapter._api = fake_api

    logs = adapter.get_access_logs("l1")
    assert len(logs) == 1
    assert logs[0]["action"] == "lock"
