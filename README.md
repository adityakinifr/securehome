# SecureHome

A smart home security monitoring app with multi-platform support — Google Nest (SDM API), Schlage locks, and TP-Link Kasa/Tapo devices.

## Features

- **Night Check** — Scans all locks and doors at a scheduled time and alerts you if anything is unlocked or open
- **Visitor Summary** — End-of-day report aggregating person-detection and doorbell events from your cameras
- **Device Dashboard** — List all devices across all platforms in one view
- **Real-time Events** — Listens to Google Cloud Pub/Sub for camera/doorbell notifications
- **Schlage Lock Control** — Lock/unlock, status checks, and access history via pyschlage
- **Kasa Device Control** — On/off, brightness, energy monitoring for TP-Link Kasa/Tapo devices

## Supported Platforms

| Platform | Devices | Library |
|---|---|---|
| **Google Nest** (SDM API) | Cameras, doorbells, thermostats | google-api-python-client |
| **Schlage** | Encode smart locks | pyschlage |
| **TP-Link Kasa/Tapo** | Plugs, switches, bulbs, light strips, cameras | python-kasa |

## Setup

### 1. Install

```bash
# Core (Nest only)
pip install -e .

# With Schlage support
pip install -e ".[schlage]"

# With Kasa support
pip install -e ".[kasa]"

# Everything
pip install -e ".[all]"
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your credentials
```

Key settings in `.env`:

```bash
# Which adapters to enable (comma-separated)
ADAPTERS=sdm,schlage,kasa

# Schlage credentials (Schlage Home app login)
SCHLAGE_USERNAME=you@email.com
SCHLAGE_PASSWORD=your-password

# Kasa credentials (TP-Link app login, needed for newer devices)
KASA_USERNAME=you@email.com
KASA_PASSWORD=your-password
KASA_TARGET=192.168.1.0/24  # optional: network to scan
```

### 3. Google Nest Setup (optional)

1. Create a Google Cloud project and enable the **Smart Device Management API**
2. Register a Device Access project at console.nest.google.com (one-time $5 fee)
3. Create OAuth 2.0 credentials (Desktop app type)
4. Set up Cloud Pub/Sub for camera events

## Usage

```bash
# List all devices across all platforms
securehome devices

# Night security check
securehome night-check
securehome night-check --lock    # auto-lock unlocked Schlage locks

# Visitor summary (camera person-detection events)
securehome summary

# Schlage lock access history
securehome lock-history

# Kasa device control
securehome kasa list             # discover devices on network
securehome kasa on 192.168.1.10  # turn on a device
securehome kasa off 192.168.1.10
securehome kasa energy 192.168.1.10  # energy monitoring

# Run the daemon (scheduled checks + real-time events)
securehome watch
```

## Architecture

```
securehome/
├── adapters/             # Pluggable device backends
│   ├── base.py           # Abstract DeviceAdapter interface
│   ├── sdm.py            # Google SDM API (Nest devices)
│   ├── schlage.py         # Schlage Encode locks (pyschlage)
│   └── kasa.py           # TP-Link Kasa/Tapo (python-kasa)
├── services/
│   ├── night_check.py     # Lock/door security scanner
│   ├── visitor_summary.py # End-of-day event aggregation
│   ├── event_store.py     # In-memory camera event storage
│   ├── event_listener.py  # Pub/Sub real-time event receiver
│   └── scheduler.py       # Timed task runner
├── auth.py                # Google OAuth 2.0 flow
├── config.py              # Settings from .env
├── models.py              # Pydantic domain models
└── cli.py                 # CLI entry point
```

### Adding new device backends

Implement `securehome.adapters.base.DeviceAdapter` and add it to the `_build_adapters()` factory in `cli.py`.
