"""End-of-day visitor summary — aggregates person-detection and doorbell events."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from securehome.models import EventType, VisitorSummary

from .event_store import event_store

logger = logging.getLogger(__name__)


def generate_visitor_summary() -> VisitorSummary:
    """Build a summary of today's visitor-related camera events."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    events = event_store.get_today_events()

    person_events = [e for e in events if e.event_type == EventType.PERSON]
    doorbell_events = [e for e in events if e.event_type == EventType.DOORBELL]
    motion_events = [e for e in events if e.event_type == EventType.MOTION]

    summary = VisitorSummary(
        date=today,
        total_person_events=len(person_events),
        total_doorbell_presses=len(doorbell_events),
        total_motion_events=len(motion_events),
        events=person_events + doorbell_events,
    )

    logger.info(
        "Visitor summary for %s: %d person(s), %d doorbell(s), %d motion(s)",
        today,
        summary.total_person_events,
        summary.total_doorbell_presses,
        summary.total_motion_events,
    )

    return summary
