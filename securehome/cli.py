"""Command-line interface for SecureHome."""

from __future__ import annotations

import argparse
import logging
import sys
import threading

from rich.console import Console
from rich.table import Table

from securehome.adapters.base import DeviceAdapter
from securehome.config import settings
from securehome.services.event_listener import start_listener
from securehome.services.event_store import event_store
from securehome.services.night_check import run_night_check
from securehome.services.scheduler import start_scheduler
from securehome.services.visitor_summary import generate_visitor_summary

console = Console()
logger = logging.getLogger(__name__)


def _setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


def _build_adapters(adapter_names: list[str] | None = None) -> list[DeviceAdapter]:
    """Instantiate the adapters specified in config (or override with adapter_names)."""
    names = adapter_names or [a.strip() for a in settings.adapters.split(",") if a.strip()]
    adapters: list[DeviceAdapter] = []

    for name in names:
        try:
            if name == "sdm":
                from securehome.adapters.sdm import SDMAdapter
                adapters.append(SDMAdapter())
            elif name == "schlage":
                from securehome.adapters.schlage import SchlageAdapter
                adapters.append(SchlageAdapter())
            elif name == "kasa":
                from securehome.adapters.kasa import KasaAdapter
                target = settings.kasa_target or None
                adapters.append(KasaAdapter(target=target))
            else:
                logger.warning("Unknown adapter: %s", name)
        except Exception:
            logger.exception("Failed to initialize %s adapter", name)

    if not adapters:
        console.print("[yellow]Warning: no adapters loaded. Check ADAPTERS in .env[/]")

    return adapters


# ---------- Sub-commands ----------


def cmd_devices(args: argparse.Namespace) -> None:
    """List all devices and their current state."""
    adapters = _build_adapters()
    all_devices = []
    for adapter in adapters:
        try:
            all_devices.extend(adapter.list_devices())
        except Exception:
            logger.exception("Failed to list devices from %s", type(adapter).__name__)

    table = Table(title=f"Devices ({len(all_devices)} total)")
    table.add_column("Name", style="cyan")
    table.add_column("Type")
    table.add_column("Room")
    table.add_column("Online", justify="center")
    table.add_column("Lock")
    table.add_column("Door")

    for dev in all_devices:
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
    adapters = _build_adapters()
    result = run_night_check(adapters)

    if result.all_secure:
        console.print("[bold green]All secure![/] Every lock is locked and every door is closed.")
    else:
        console.print("[bold red]Security issues found:[/]")
        for lock in result.unlocked_locks:
            console.print(f"  [red]Unlocked lock:[/] {lock.name} ({lock.room})")
        for door in result.open_doors:
            console.print(f"  [red]Open door:[/] {door.name} ({door.room})")

    if args.lock and result.unlocked_locks:
        console.print("\n[bold]Auto-locking...[/]")
        for adapter in adapters:
            for lock in result.unlocked_locks:
                if adapter.lock(lock.id):
                    console.print(f"  [green]Locked[/] {lock.name}")


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


def cmd_lock_history(args: argparse.Namespace) -> None:
    """Show access history for Schlage locks."""
    adapters = _build_adapters(["schlage"])
    if not adapters:
        console.print("[red]Schlage adapter not available. Check credentials.[/]")
        return

    from securehome.adapters.schlage import SchlageAdapter
    for adapter in adapters:
        if isinstance(adapter, SchlageAdapter):
            devices = adapter.list_devices()
            for dev in devices:
                console.print(f"\n[bold cyan]{dev.name}[/] ({dev.lock_state.value})")
                logs = adapter.get_access_logs(dev.id)
                if not logs:
                    console.print("  No access logs available")
                    continue
                for entry in logs[:20]:  # Show last 20 entries
                    console.print(f"  {entry}")


def cmd_kasa(args: argparse.Namespace) -> None:
    """Kasa device control sub-commands."""
    adapters = _build_adapters(["kasa"])
    if not adapters:
        console.print("[red]Kasa adapter not available. Check KASA_USERNAME/KASA_PASSWORD.[/]")
        return

    from securehome.adapters.kasa import KasaAdapter
    kasa: KasaAdapter = adapters[0]

    if args.kasa_action == "list":
        devices = kasa.list_devices()
        table = Table(title="Kasa Devices")
        table.add_column("IP / ID", style="cyan")
        table.add_column("Name")
        table.add_column("Type")
        table.add_column("On", justify="center")
        table.add_column("Model")

        for dev in devices:
            table.add_row(
                dev.id,
                dev.name,
                dev.device_type.value,
                "[green]Yes[/]" if dev.raw_traits.get("is_on") else "[red]No[/]",
                dev.raw_traits.get("model", ""),
            )
        console.print(table)

    elif args.kasa_action == "on":
        if kasa.turn_on(args.device):
            console.print(f"[green]Turned on[/] {args.device}")
        else:
            console.print(f"[red]Failed to turn on[/] {args.device}")

    elif args.kasa_action == "off":
        if kasa.turn_off(args.device):
            console.print(f"[green]Turned off[/] {args.device}")
        else:
            console.print(f"[red]Failed to turn off[/] {args.device}")

    elif args.kasa_action == "energy":
        usage = kasa.get_energy_usage(args.device)
        if usage:
            console.print(f"[bold]Energy usage for {args.device}:[/]")
            for key, val in usage.items():
                console.print(f"  {key}: {val}")
        else:
            console.print(f"[yellow]No energy data available for {args.device}[/]")


def cmd_watch(args: argparse.Namespace) -> None:
    """Run the daemon: scheduler + Pub/Sub event listener."""
    adapters = _build_adapters()
    console.print("[bold]Starting SecureHome daemon...[/]")
    console.print(f"  Active adapters: {', '.join(type(a).__name__ for a in adapters)}")

    start_scheduler(adapters)
    console.print("  Scheduler started (night check + visitor summary)")

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
    sub.add_parser("devices", help="List all devices from all adapters")

    # night-check
    nc = sub.add_parser("night-check", help="Run a security check on locks and doors")
    nc.add_argument("--lock", action="store_true", help="Auto-lock any unlocked locks")

    # summary
    sub.add_parser("summary", help="Print today's visitor summary")

    # lock-history
    sub.add_parser("lock-history", help="Show Schlage lock access history")

    # kasa
    kasa_parser = sub.add_parser("kasa", help="Control Kasa/Tapo devices")
    kasa_sub = kasa_parser.add_subparsers(dest="kasa_action")
    kasa_sub.add_parser("list", help="Discover and list Kasa devices")
    kasa_on = kasa_sub.add_parser("on", help="Turn on a device")
    kasa_on.add_argument("device", help="Device IP or name")
    kasa_off = kasa_sub.add_parser("off", help="Turn off a device")
    kasa_off.add_argument("device", help="Device IP or name")
    kasa_energy = kasa_sub.add_parser("energy", help="Show energy usage")
    kasa_energy.add_argument("device", help="Device IP or name")

    # watch
    sub.add_parser("watch", help="Run the daemon (scheduler + event listener)")

    args = parser.parse_args()
    _setup_logging(args.verbose)

    commands = {
        "devices": cmd_devices,
        "night-check": cmd_night_check,
        "summary": cmd_summary,
        "lock-history": cmd_lock_history,
        "kasa": cmd_kasa,
        "watch": cmd_watch,
    }

    if args.command in commands:
        commands[args.command](args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
