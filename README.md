# SecureHome

A Google Home security monitoring app that connects to your Nest devices via the Smart Device Management (SDM) API.

## Features

- **Night Check** — Scans all locks and doors at a scheduled time and alerts you if anything is unlocked or open
- **Visitor Summary** — End-of-day report aggregating person-detection and doorbell events from your cameras
- **Device Dashboard** — List all devices and their current states
- **Real-time Events** — Listens to Google Cloud Pub/Sub for camera/doorbell notifications (person detected, doorbell pressed, motion, sound)

## Setup

### 1. Google Cloud & Device Access

1. Create a [Google Cloud project](https://console.cloud.google.com/) and enable the **Smart Device Management API**
2. Register a [Device Access project](https://console.nest.google.com/device-access) (one-time $5 fee)
3. Create OAuth 2.0 credentials (Desktop app type) in the Google Cloud Console
4. Set up a [Cloud Pub/Sub](https://console.cloud.google.com/cloudpubsub) subscription for SDM events

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your credentials and project IDs
```

### 3. Install

```bash
pip install -e .
```

### 4. Authenticate

The first time you run any command, a browser window will open for Google OAuth consent.

## Usage

```bash
# List all devices
securehome devices

# Run a night security check now
securehome night-check

# Auto-lock any unlocked locks during night check
securehome night-check --lock

# Print today's visitor summary
securehome summary

# Run the daemon (scheduled checks + real-time event listener)
securehome watch
```

## Architecture

```
securehome/
├── adapters/          # Pluggable device backends
│   ├── base.py        # Abstract DeviceAdapter interface
│   └── sdm.py         # Google SDM API (Nest devices)
├── services/
│   ├── night_check.py     # Lock/door security scanner
│   ├── visitor_summary.py # End-of-day event aggregation
│   ├── event_store.py     # In-memory camera event storage
│   ├── event_listener.py  # Pub/Sub real-time event receiver
│   └── scheduler.py       # Timed task runner
├── auth.py            # OAuth 2.0 flow
├── config.py          # Settings from .env
├── models.py          # Pydantic domain models
└── cli.py             # CLI entry point
```

### Adding new device backends

Implement `securehome.adapters.base.DeviceAdapter` for any smart home platform (SmartThings, Home Assistant, August, etc.) and pass it alongside the SDM adapter.

## Limitations

The SDM API only covers **Nest-branded devices** (cameras, doorbells, thermostats). Third-party locks, sensors, and doors added to Google Home are not accessible through this API. The adapter pattern allows you to add manufacturer-specific APIs for those devices.
