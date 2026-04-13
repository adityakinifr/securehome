"""Pub/Sub listener for real-time Nest camera and doorbell events."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from securehome.config import settings
from securehome.models import CameraEvent, EventType

from .event_store import event_store

logger = logging.getLogger(__name__)

# SDM event type → our EventType
_EVENT_TYPE_MAP: dict[str, EventType] = {
    "sdm.devices.events.CameraPerson.Person": EventType.PERSON,
    "sdm.devices.events.CameraMotion.Motion": EventType.MOTION,
    "sdm.devices.events.CameraSound.Sound": EventType.SOUND,
    "sdm.devices.events.DoorbellChime.Chime": EventType.DOORBELL,
}


def _parse_sdm_event(message_data: dict) -> CameraEvent | None:
    """Parse a Pub/Sub message payload into a CameraEvent."""
    resource_update = message_data.get("resourceUpdate", {})
    device_name = resource_update.get("name", "")
    device_id = device_name.rsplit("/", 1)[-1] if "/" in device_name else device_name

    events = resource_update.get("events", {})
    for sdm_event_type, our_type in _EVENT_TYPE_MAP.items():
        if sdm_event_type in events:
            event_data = events[sdm_event_type]
            return CameraEvent(
                device_id=device_id,
                event_type=our_type,
                timestamp=datetime.fromisoformat(
                    message_data.get("timestamp", datetime.now(timezone.utc).isoformat())
                ),
                event_id=event_data.get("eventId", ""),
            )
    return None


def start_listener() -> None:
    """Start a blocking Pub/Sub subscriber.  Run this in a background thread."""
    try:
        from google.cloud import pubsub_v1
    except ImportError:
        logger.error("google-cloud-pubsub not installed — cannot listen for events")
        return

    subscriber = pubsub_v1.SubscriberClient()
    subscription_path = subscriber.subscription_path(
        settings.pubsub_project_id, settings.pubsub_subscription_id
    )

    def callback(message):
        try:
            data = json.loads(message.data.decode("utf-8"))
            event = _parse_sdm_event(data)
            if event:
                logger.info("Camera event: %s on %s", event.event_type, event.device_id)
                event_store.add(event)
            message.ack()
        except Exception:
            logger.exception("Failed to process Pub/Sub message")
            message.nack()

    future = subscriber.subscribe(subscription_path, callback=callback)
    logger.info("Listening for events on %s", subscription_path)

    try:
        future.result()  # blocks
    except KeyboardInterrupt:
        future.cancel()
        future.result()
