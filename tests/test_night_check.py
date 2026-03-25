"""Tests for the night check service."""

from securehome.models import Device, DeviceType, DoorState, LockState
from securehome.services.night_check import run_night_check


class FakeAdapter:
    def __init__(self, devices):
        self._devices = devices

    def list_devices(self):
        return self._devices

    def get_device(self, device_id):
        return next((d for d in self._devices if d.id == device_id), None)

    def lock(self, device_id):
        return True

    def unlock(self, device_id):
        return True

    def get_recent_events(self, hours=24):
        return []


def test_all_secure():
    devices = [
        Device(id="lock1", name="Front Door", device_type=DeviceType.LOCK, lock_state=LockState.LOCKED),
        Device(id="door1", name="Garage", device_type=DeviceType.DOOR, door_state=DoorState.CLOSED),
    ]
    result = run_night_check([FakeAdapter(devices)])
    assert result.all_secure is True
    assert result.unlocked_locks == []
    assert result.open_doors == []


def test_unlocked_lock():
    devices = [
        Device(id="lock1", name="Front Door", device_type=DeviceType.LOCK, lock_state=LockState.UNLOCKED),
        Device(id="lock2", name="Back Door", device_type=DeviceType.LOCK, lock_state=LockState.LOCKED),
    ]
    result = run_night_check([FakeAdapter(devices)])
    assert result.all_secure is False
    assert len(result.unlocked_locks) == 1
    assert result.unlocked_locks[0].id == "lock1"


def test_open_door():
    devices = [
        Device(id="door1", name="Garage", device_type=DeviceType.DOOR, door_state=DoorState.OPEN, open_percent=100),
    ]
    result = run_night_check([FakeAdapter(devices)])
    assert result.all_secure is False
    assert len(result.open_doors) == 1


def test_multiple_adapters():
    adapter1 = FakeAdapter([
        Device(id="lock1", name="Front", device_type=DeviceType.LOCK, lock_state=LockState.LOCKED),
    ])
    adapter2 = FakeAdapter([
        Device(id="lock2", name="Back", device_type=DeviceType.LOCK, lock_state=LockState.UNLOCKED),
    ])
    result = run_night_check([adapter1, adapter2])
    assert result.all_secure is False
    assert len(result.unlocked_locks) == 1


def test_no_devices():
    result = run_night_check([FakeAdapter([])])
    assert result.all_secure is True
