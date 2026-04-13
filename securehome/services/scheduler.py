"""Scheduled tasks — runs night check and visitor summary at configured times."""

from __future__ import annotations

import logging
import threading
import time

import schedule

from securehome.adapters.base import DeviceAdapter
from securehome.config import settings

from .night_check import run_night_check
from .visitor_summary import generate_visitor_summary

logger = logging.getLogger(__name__)


def _night_check_job(adapters: list[DeviceAdapter]) -> None:
    result = run_night_check(adapters)
    if not result.all_secure:
        # In production, send a push notification / email / SMS here
        logger.warning("ALERT: Home is NOT secure at night!")
        for lock in result.unlocked_locks:
            logger.warning("  Unlocked: %s (%s)", lock.name, lock.room)
        for door in result.open_doors:
            logger.warning("  Open: %s (%s)", door.name, door.room)


def _visitor_summary_job() -> None:
    summary = generate_visitor_summary()
    logger.info("=== End-of-Day Visitor Summary ===")
    logger.info("Date: %s", summary.date)
    logger.info("People detected: %d", summary.total_person_events)
    logger.info("Doorbell presses: %d", summary.total_doorbell_presses)
    logger.info("Motion events: %d", summary.total_motion_events)


def start_scheduler(adapters: list[DeviceAdapter]) -> threading.Thread:
    """Configure and start the scheduler in a background daemon thread."""
    night_time = f"{settings.night_check_hour:02d}:{settings.night_check_minute:02d}"
    summary_time = f"{settings.summary_hour:02d}:{settings.summary_minute:02d}"

    schedule.every().day.at(night_time).do(_night_check_job, adapters=adapters)
    schedule.every().day.at(summary_time).do(_visitor_summary_job)

    logger.info("Scheduler: night check at %s, visitor summary at %s", night_time, summary_time)

    def _run():
        while True:
            schedule.run_pending()
            time.sleep(30)

    thread = threading.Thread(target=_run, daemon=True, name="scheduler")
    thread.start()
    return thread
