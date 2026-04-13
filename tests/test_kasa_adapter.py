"""Tests for the Kasa adapter (mocked — does not require python-kasa installed)."""

from unittest.mock import AsyncMock, MagicMock, patch

from securehome.models import Device, DeviceType


def test_to_device():
    from securehome.adapters.kasa import KasaAdapter

    fake_dev = MagicMock()
    fake_dev.alias = "Living Room Light"
    fake_dev.is_on = True
    fake_dev.model = "KL130"
    fake_dev.hw_info = {"hw_ver": "1.0"}

    # Mock the DeviceType enum from kasa
    with patch("securehome.adapters.kasa._map_device_type", return_value=DeviceType.LIGHT):
        device = KasaAdapter._to_device("192.168.1.10", fake_dev)

    assert device.id == "192.168.1.10"
    assert device.name == "Living Room Light"
    assert device.device_type == DeviceType.LIGHT
    assert device.raw_traits["is_on"] is True
    assert device.raw_traits["model"] == "KL130"


def test_get_credentials_set(monkeypatch):
    monkeypatch.setenv("KASA_USERNAME", "user@test.com")
    monkeypatch.setenv("KASA_PASSWORD", "secret")

    from securehome.adapters.kasa import _get_credentials
    creds = _get_credentials()
    assert creds == {"username": "user@test.com", "password": "secret"}


def test_get_credentials_empty(monkeypatch):
    monkeypatch.delenv("KASA_USERNAME", raising=False)
    monkeypatch.delenv("KASA_PASSWORD", raising=False)

    from securehome.adapters.kasa import _get_credentials
    creds = _get_credentials()
    assert creds is None


def test_lock_not_supported():
    from securehome.adapters.kasa import KasaAdapter

    adapter = KasaAdapter.__new__(KasaAdapter)
    assert adapter.lock("anything") is False
    assert adapter.unlock("anything") is False


def test_get_recent_events_empty():
    from securehome.adapters.kasa import KasaAdapter

    adapter = KasaAdapter.__new__(KasaAdapter)
    assert adapter.get_recent_events() == []
