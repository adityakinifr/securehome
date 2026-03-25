"""Tests for the visitor summary service."""

from datetime import datetime, timezone

from securehome.models import CameraEvent, EventType
from securehome.services.event_store import EventStore, event_store
from securehome.services.visitor_summary import generate_visitor_summary


def _make_event(event_type: EventType, hour: int = 12) -> CameraEvent:
    return CameraEvent(
        device_id="cam1",
        device_name="Front Camera",
        event_type=event_type,
        timestamp=datetime.now(timezone.utc).replace(hour=hour, minute=0, second=0),
        event_id=f"evt-{hour}",
    )


def test_empty_summary():
    # Clear the singleton store
    event_store._events.clear()
    summary = generate_visitor_summary()
    assert summary.total_person_events == 0
    assert summary.total_doorbell_presses == 0
    assert summary.total_motion_events == 0


def test_summary_counts():
    event_store._events.clear()
    event_store.add(_make_event(EventType.PERSON, 10))
    event_store.add(_make_event(EventType.PERSON, 11))
    event_store.add(_make_event(EventType.DOORBELL, 12))
    event_store.add(_make_event(EventType.MOTION, 13))
    event_store.add(_make_event(EventType.MOTION, 14))
    event_store.add(_make_event(EventType.MOTION, 15))

    summary = generate_visitor_summary()
    assert summary.total_person_events == 2
    assert summary.total_doorbell_presses == 1
    assert summary.total_motion_events == 3
    # events list contains person + doorbell only
    assert len(summary.events) == 3


def test_event_store_prune():
    store = EventStore()
    old_event = CameraEvent(
        device_id="cam1",
        event_type=EventType.MOTION,
        timestamp=datetime(2020, 1, 1, tzinfo=timezone.utc),
    )
    recent_event = _make_event(EventType.PERSON, 10)
    store.add(old_event)
    store.add(recent_event)

    removed = store.prune(older_than_hours=48)
    assert removed == 1
    assert len(store.get_events()) == 1
