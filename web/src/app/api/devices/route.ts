import { getAdapters, json } from "@/lib/api-helpers";
import type { Device } from "@/types/device";

export async function GET() {
  const adapters = await getAdapters();
  const devices: Device[] = [];

  for (const adapter of adapters) {
    try {
      const d = await adapter.listDevices();
      devices.push(...d);
    } catch (e) {
      console.error(`Failed to list from ${adapter.name}:`, e);
    }
  }

  return json(devices);
}
