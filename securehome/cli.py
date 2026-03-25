"""Command-line interface for SecureHome."""

from __future__ import annotations

import argparse
import logging
import sys
import threading

from rich.console import Console
from rich.table import Table

from securehome.adapters.sdm import SDMAdapter
from securehome.services.event_listener import start_listener
from securehome.services.event_store import event_store
from securehome.services.night_check import run_night_check
from securehome.services.scheduler import start_scheduler
from securehome.services.visitor_summary import generate_visitor_summary

console = Console()


def _setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


# ---------- Sub-commands ----------


def cmd_devices(args: argparse.Namespace) -> None:
    """List all devices and their current state."""
    adapter = SDMAdapter()
    devices = adapter.list_devices()

    table = Table(title="Devices")
    table.add_column("Name", style="cyan")
    table.add_column("Type")
    table.add_column("Room")
    table.add_column("Online", justify="center")
    table.add_column("Lock")
    table.add_column("Door")

    for dev in devices:
        table.add_row(
            dev.name,
            dev.device_type.value,
            dev.room,
            "[green]Yes[/]" if dev.online else "[red]No[/]",
            dev.lock_state.value if dev.lock_state.value != "UNKNOWN" else "-",
            dev.door_state.value if dev.door_state.value != "UNKNOWN" else "-",
        )

    console.print(table)


def cmd_night_check(args: argparse.Namespace) -> None:
    """Run the night security check right now."""
    adapter = SDMAdapter()
    result = run_night_check([adapter])

    if result.all_secure:
        console.print("[bold green]All secure![/] Every lock is locked and every door is closed.")
    else:
        console.print("[bold red]Security issues found:[/]")
        for lock in result.unlocked_locks:
            console.print(f"  [red]Unlocked lock:[/] {lock.name} ({lock.room})")
        for door in result.open_doors:
            console.print(f"  [red]Open door:[/] {door.name} ({door.room})")

    if args.lock:
        for lock in result.unlocked_locks:
            console.print(f"  Locking {lock.name}...")
            adapter.lock(lock.id)


def cmd_summary(args: argparse.Namespace) -> None:
    """Print today's visitor summary."""
    summary = generate_visitor_summary()

    table = Table(title=f"Visitor Summary — {summary.date}")
    table.add_column("Metric", style="cyan")
    table.add_column("Count", justify="right")

    table.add_row("People detected", str(summary.total_person_events))
    table.add_row("Doorbell presses", str(summary.total_doorbell_presses))
    table.add_row("Motion events", str(summary.total_motion_events))

    console.print(table)

    if summary.events:
        console.print("\n[bold]Event timeline:[/]")
        for ev in summary.events:
            console.print(
                f"  {ev.timestamp:%H:%M:%S}  {ev.event_type.value:10s}  {ev.device_name or ev.device_id}"
            )


def cmd_watch(args: argparse.Namespace) -> None:
    """Run the daemon: scheduler + Pub/Sub event listener."""
    adapter = SDMAdapter()
    console.print("[bold]Starting SecureHome daemon...[/]")

    # Start scheduler
    start_scheduler([adapter])
    console.print("  Scheduler started (night check + visitor summary)")

    # Start Pub/Sub listener in a background thread
    listener_thread = threading.Thread(target=start_listener, daemon=True, name="pubsub-listener")
    listener_thread.start()
    console.print("  Pub/Sub event listener started")

    console.print("\n[green]SecureHome is running. Press Ctrl+C to stop.[/]")
    try:
        listener_thread.join()
    except KeyboardInterrupt:
        console.print("\n[yellow]Shutting down...[/]")


# ---------- Main entry point ----------


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="securehome",
        description="SecureHome — Google Home security monitoring and control",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable debug logging")
    sub = parser.add_subparsers(dest="command")

    # devices
    sub.add_parser("devices", help="List all devices")

    # night-check
    nc = sub.add_parser("night-check", help="Run a security check on locks and doors")
    nc.add_argument("--lock", action="store_true", help="Auto-lock any unlocked locks")

    # summary
    sub.add_parser("summary", help="Print today's visitor summary")

    # watch
    sub.add_parser("watch", help="Run the daemon (scheduler + event listener)")

    args = parser.parse_args()
    _setup_logging(args.verbose)

    commands = {
        "devices": cmd_devices,
        "night-check": cmd_night_check,
        "summary": cmd_summary,
        "watch": cmd_watch,
    }

    if args.command in commands:
        commands[args.command](args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
