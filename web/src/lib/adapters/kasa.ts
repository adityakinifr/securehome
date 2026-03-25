import type { Device, DeviceType, CameraEvent } from "@/types/device";
import type { DeviceAdapter } from "./types";

/**
 * TP-Link Kasa cloud adapter.
 *
 * Uses the TP-Link cloud API (same backend as the Kasa/Tapo mobile apps).
 * Auth: POST to wap.tplinkcloud.com with login method.
 * Control: POST with passthrough method for device commands.
 */

const CLOUD_URL = "https://wap.tplinkcloud.com";

const kasaTokenCache = new Map<string, { token: string; expiresAt: number }>();

async function authenticate(username: string, password: string): Promise<string> {
  const cached = kasaTokenCache.get(username);
  if (cached && Date.now() / 1000 < cached.expiresAt - 60) {
    return cached.token;
  }

  const res = await fetch(CLOUD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "login",
      params: {
        appType: "Kasa_Android",
        cloudUserName: username,
        cloudPassword: password,
        terminalUUID: "securehome-web",
      },
    }),
  });

  const data = await res.json();
  if (data.error_code !== 0) {
    throw new Error(`Kasa auth failed: ${JSON.stringify(data)}`);
  }

  kasaTokenCache.set(username, {
    token: data.result.token,
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
  });
  return data.result.token;
}

async function cloudRequest(method: string, params: any, username: string, password: string): Promise<any> {
  const token = await authenticate(username, password);
  const res = await fetch(`${CLOUD_URL}?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, params }),
  });
  const data = await res.json();
  if (data.error_code !== 0) {
    throw new Error(`Kasa API error: ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function passthrough(
  deviceId: string,
  appServerUrl: string,
  command: any,
  username: string,
  password: string
): Promise<any> {
  const token = await authenticate(username, password);
  const res = await fetch(`${appServerUrl}?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "passthrough",
      params: {
        deviceId,
        requestData: JSON.stringify(command),
      },
    }),
  });
  const data = await res.json();
  if (data.error_code !== 0) {
    throw new Error(`Kasa passthrough error: ${JSON.stringify(data)}`);
  }
  const responseData = data.result?.responseData;
  return responseData ? JSON.parse(responseData) : {};
}

function mapDeviceType(deviceType: string, model: string): DeviceType {
  const m = model.toLowerCase();
  if (m.includes("bulb") || m.startsWith("kl") || m.startsWith("lb") || m.startsWith("l5"))
    return "LIGHT";
  if (m.startsWith("kc") || m.startsWith("c1") || m.startsWith("c2"))
    return "CAMERA";
  return "OTHER";
}

interface KasaCloudDevice {
  deviceId: string;
  alias: string;
  deviceType: string;
  deviceModel: string;
  appServerUrl: string;
  status: number; // 1 = online
}

// Cache device list with server URLs for passthrough
let deviceCache: Map<string, KasaCloudDevice> = new Map();

function parseDevice(raw: KasaCloudDevice): Device {
  return {
    id: raw.deviceId,
    name: raw.alias || raw.deviceModel,
    device_type: mapDeviceType(raw.deviceType, raw.deviceModel),
    room: "",
    online: raw.status === 1,
    raw_traits: {
      model: raw.deviceModel,
      device_type: raw.deviceType,
    },
    lock_state: "UNKNOWN",
    door_state: "UNKNOWN",
    open_percent: 0,
  };
}

export class KasaAdapter implements DeviceAdapter {
  name = "KasaAdapter";
  private username: string;
  private password: string;

  constructor(username?: string, password?: string) {
    this.username = username || process.env.KASA_USERNAME || "";
    this.password = password || process.env.KASA_PASSWORD || "";
  }

  async listDevices(): Promise<Device[]> {
    const result = await cloudRequest("getDeviceList", {}, this.username, this.password);
    const devices: KasaCloudDevice[] = result.deviceList ?? [];

    deviceCache = new Map();
    for (const d of devices) {
      deviceCache.set(d.deviceId, d);
    }

    return devices.map(parseDevice);
  }

  async getDevice(deviceId: string): Promise<Device | null> {
    if (deviceCache.size === 0) await this.listDevices();
    const raw = deviceCache.get(deviceId);
    return raw ? parseDevice(raw) : null;
  }

  async lock(): Promise<boolean> {
    return false;
  }

  async unlock(): Promise<boolean> {
    return false;
  }

  async turnOn(deviceId: string): Promise<boolean> {
    const dev = deviceCache.get(deviceId);
    if (!dev) return false;
    try {
      await passthrough(deviceId, dev.appServerUrl, {
        system: { set_relay_state: { state: 1 } },
      }, this.username, this.password);
      return true;
    } catch {
      return false;
    }
  }

  async turnOff(deviceId: string): Promise<boolean> {
    const dev = deviceCache.get(deviceId);
    if (!dev) return false;
    try {
      await passthrough(deviceId, dev.appServerUrl, {
        system: { set_relay_state: { state: 0 } },
      }, this.username, this.password);
      return true;
    } catch {
      return false;
    }
  }

  async getEnergyUsage(
    deviceId: string
  ): Promise<Record<string, unknown> | null> {
    const dev = deviceCache.get(deviceId);
    if (!dev) return null;
    try {
      const data = await passthrough(deviceId, dev.appServerUrl, {
        emeter: { get_realtime: {} },
      }, this.username, this.password);
      return data?.emeter?.get_realtime ?? null;
    } catch {
      return null;
    }
  }

  async getRecentEvents(): Promise<CameraEvent[]> {
    return [];
  }
}
