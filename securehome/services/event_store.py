"""In-memory event store for camera/doorbell events.

Events arrive via Pub/Sub and are stored here for querying by the
summary and dashboard services.  For production use, swap this out
for a persistent store (SQLite, Redis, etc.).
"""

from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone

from securehome.models import CameraEvent, EventType


class EventStore:
    """Thread-safe, in-memory camera event store."""

    def __init__(self) -> None:
        self._events: list[CameraEvent] = []
        self._lock = threading.Lock()

    def add(self, event: CameraEvent) -> None:
        with self._lock:
            self._events.append(event)

    def get_events(
        self,
        since: datetime | None = None,
        event_type: EventType | None = None,
        device_id: str | None = None,
    ) -> list[CameraEvent]:
        with self._lock:
            results = list(self._events)

        if since:
            results = [e for e in results if e.timestamp >= since]
        if event_type:
            results = [e for e in results if e.event_type == event_type]
        if device_id:
            results = [e for e in results if e.device_id == device_id]

        return sorted(results, key=lambda e: e.timestamp)

    def get_today_events(self) -> list[CameraEvent]:
        now = datetime.now(timezone.utc)
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return self.get_events(since=start_of_day)

    def prune(self, older_than_hours: int = 48) -> int:
        """Remove events older than the given threshold. Returns count removed."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=older_than_hours)
        with self._lock:
            before = len(self._events)
            self._events = [e for e in self._events if e.timestamp >= cutoff]
            return before - len(self._events)


# Singleton instance used across the app
event_store = EventStore()
