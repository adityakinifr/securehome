import type { Device, DeviceType, DoorState, CameraEvent } from "@/types/device";
import type { DeviceAdapter } from "./types";

const TYPE_MAP: Record<string, DeviceType> = {
  "sdm.devices.types.CAMERA": "CAMERA",
  "sdm.devices.types.DOORBELL": "DOORBELL",
  "sdm.devices.types.THERMOSTAT": "THERMOSTAT",
  "sdm.devices.types.DISPLAY": "OTHER",
};

function parseDevice(raw: any): Device {
  const namePath: string = raw.name ?? "";
  const deviceId = namePath.includes("/")
    ? namePath.split("/").pop()!
    : namePath;
  const sdmType: string = raw.type ?? "";
  const traits: Record<string, any> = raw.traits ?? {};

  let displayName = "";
  let room = "";
  for (const rel of raw.parentRelations ?? []) {
    displayName = rel.displayName ?? "";
    room = displayName;
  }

  const deviceType = TYPE_MAP[sdmType] ?? "OTHER";
  const online =
    traits["sdm.devices.traits.Connectivity"]?.status === "ONLINE";
  const openPct =
    traits["sdm.devices.traits.OpenClose"]?.openPercent ?? 0;
  const doorState: DoorState = openPct > 0 ? "OPEN" : "CLOSED";

  return {
    id: deviceId,
    name: displayName || deviceId,
    device_type: deviceType,
    room,
    online,
    raw_traits: traits,
    lock_state: "UNKNOWN",
    door_state: doorState,
    open_percent: openPct,
  };
}

export class SDMAdapter implements DeviceAdapter {
  name = "SDMAdapter";
  private baseUrl: string;
  private accessToken: string;

  constructor(accessToken: string, projectId?: string) {
    const pid = projectId ?? process.env.SDM_PROJECT_ID ?? "";
    this.baseUrl = `https://smartdevicemanagement.googleapis.com/v1/enterprises/${pid}`;
    this.accessToken = accessToken;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  private async get(path: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`SDM API error: ${res.status}`);
    return res.json();
  }

  private async post(path: string, body: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`SDM API error: ${res.status}`);
    return res.json();
  }

  async listDevices(): Promise<Device[]> {
    const data = await this.get("/devices");
    return (data.devices ?? []).map(parseDevice);
  }

  async getDevice(deviceId: string): Promise<Device | null> {
    try {
      const raw = await this.get(`/devices/${deviceId}`);
      return parseDevice(raw);
    } catch {
      return null;
    }
  }

  async lock(): Promise<boolean> {
    return false; // Nest has no locks
  }

  async unlock(): Promise<boolean> {
    return false;
  }

  async getRecentEvents(): Promise<CameraEvent[]> {
    return []; // Events come via Pub/Sub webhook
  }

  async generateEventImage(
    deviceId: string,
    eventId: string
  ): Promise<string> {
    const result = await this.post(`/devices/${deviceId}:executeCommand`, {
      command: "sdm.devices.commands.CameraEventImage.GenerateImage",
      params: { eventId },
    });
    return result?.results?.url ?? "";
  }
}
