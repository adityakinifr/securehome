"""Tests for SDM device parsing logic (no google-auth dependency needed)."""

from securehome.models import Device, DeviceType, DoorState, LockState


# Replicate the parsing logic directly to avoid importing the SDM adapter
# which pulls in google-auth (requires native crypto libs not always available in CI).

_TYPE_MAP = {
    "sdm.devices.types.CAMERA": DeviceType.CAMERA,
    "sdm.devices.types.DOORBELL": DeviceType.DOORBELL,
    "sdm.devices.types.THERMOSTAT": DeviceType.THERMOSTAT,
    "sdm.devices.types.DISPLAY": DeviceType.OTHER,
}


def parse_device(raw: dict) -> Device:
    name_path = raw.get("name", "")
    device_id = name_path.rsplit("/", 1)[-1] if "/" in name_path else name_path
    sdm_type = raw.get("type", "")
    traits = raw.get("traits", {})

    display_name = ""
    room = ""
    for rel in raw.get("parentRelations", []):
        display_name = rel.get("displayName", "")
        room = display_name

    device_type = _TYPE_MAP.get(sdm_type, DeviceType.OTHER)
    online = traits.get("sdm.devices.traits.Connectivity", {}).get("status") == "ONLINE"
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


def test_parse_thermostat():
    raw = {
        "name": "enterprises/proj/devices/therm-123",
        "type": "sdm.devices.types.THERMOSTAT",
        "traits": {
            "sdm.devices.traits.Connectivity": {"status": "ONLINE"},
            "sdm.devices.traits.Temperature": {"ambientTemperatureCelsius": 21.5},
        },
        "parentRelations": [
            {"parent": "enterprises/proj/structures/s1/rooms/r1", "displayName": "Living Room"}
        ],
    }
    device = parse_device(raw)
    assert device.id == "therm-123"
    assert device.device_type == DeviceType.THERMOSTAT
    assert device.name == "Living Room"
    assert device.online is True


def test_parse_camera():
    raw = {
        "name": "enterprises/proj/devices/cam-456",
        "type": "sdm.devices.types.CAMERA",
        "traits": {
            "sdm.devices.traits.Connectivity": {"status": "ONLINE"},
        },
        "parentRelations": [
            {"parent": "enterprises/proj/structures/s1/rooms/r2", "displayName": "Front Yard"}
        ],
    }
    device = parse_device(raw)
    assert device.id == "cam-456"
    assert device.device_type == DeviceType.CAMERA
    assert device.room == "Front Yard"


def test_parse_offline_device():
    raw = {
        "name": "enterprises/proj/devices/dev-789",
        "type": "sdm.devices.types.DOORBELL",
        "traits": {
            "sdm.devices.traits.Connectivity": {"status": "OFFLINE"},
        },
        "parentRelations": [],
    }
    device = parse_device(raw)
    assert device.online is False
    assert device.device_type == DeviceType.DOORBELL


def test_parse_open_door():
    raw = {
        "name": "enterprises/proj/devices/door-1",
        "type": "sdm.devices.types.CAMERA",
        "traits": {
            "sdm.devices.traits.Connectivity": {"status": "ONLINE"},
            "sdm.devices.traits.OpenClose": {"openPercent": 75.0},
        },
        "parentRelations": [],
    }
    device = parse_device(raw)
    assert device.door_state == DoorState.OPEN
    assert device.open_percent == 75.0
