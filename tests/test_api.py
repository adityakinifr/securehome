"""Tests for the FastAPI REST backend."""

import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from securehome.models import Device, DeviceType, DoorState, LockState


@pytest.fixture
def fake_adapter():
    adapter = MagicMock()
    adapter.list_devices.return_value = [
        Device(
            id="lock-1",
            name="Front Door",
            device_type=DeviceType.LOCK,
            lock_state=LockState.LOCKED,
            online=True,
        ),
        Device(
            id="cam-1",
            name="Porch Camera",
            device_type=DeviceType.CAMERA,
            online=True,
        ),
        Device(
            id="light-1",
            name="Living Room Light",
            device_type=DeviceType.LIGHT,
            online=True,
        ),
    ]
    adapter.get_device.return_value = None
    adapter.lock.return_value = False
    adapter.unlock.return_value = False
    return adapter


@pytest.fixture
def client(fake_adapter):
    # Prevent the lifespan from trying to load real adapters
    os.environ["ADAPTERS"] = ""

    import securehome.api as api_module
    from securehome.api import app

    original = api_module._adapters
    api_module._adapters = [fake_adapter]

    with TestClient(app) as c:
        # Re-inject after lifespan resets it
        api_module._adapters = [fake_adapter]
        yield c

    api_module._adapters = original
    os.environ.pop("ADAPTERS", None)


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


def test_list_devices(client):
    resp = client.get("/api/devices")
    assert resp.status_code == 200
    devices = resp.json()
    assert len(devices) == 3
    assert devices[0]["name"] == "Front Door"
    assert devices[0]["device_type"] == "LOCK"


def test_night_check(client):
    resp = client.get("/api/night-check")
    assert resp.status_code == 200
    data = resp.json()
    assert "all_secure" in data


def test_visitor_summary(client):
    resp = client.get("/api/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "date" in data
    assert "total_person_events" in data


def test_lock_device_not_found(client):
    resp = client.post("/api/devices/nonexistent/lock")
    assert resp.status_code == 404


def test_lock_device_success(client, fake_adapter):
    fake_adapter.lock.return_value = True
    resp = client.post("/api/devices/lock-1/lock")
    assert resp.status_code == 200
    assert resp.json()["status"] == "locked"


def test_turn_on_with_mock(client):
    # MagicMock has turn_on by default, so it succeeds
    resp = client.post("/api/devices/light-1/on")
    assert resp.status_code == 200
    assert resp.json()["status"] == "on"


def test_device_not_found(client):
    resp = client.get("/api/devices/nonexistent")
    assert resp.status_code == 404
