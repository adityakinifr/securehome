import type { Device, NightCheckResult } from "@/types/device";
import type { DeviceAdapter } from "../adapters/types";

export async function runNightCheck(
  adapters: DeviceAdapter[]
): Promise<NightCheckResult> {
  const allDevices: Device[] = [];

  for (const adapter of adapters) {
    try {
      const devices = await adapter.listDevices();
      allDevices.push(...devices);
    } catch (e) {
      console.error(`Failed to list devices from ${adapter.name}:`, e);
    }
  }

  const unlockedLocks = allDevices.filter(
    (d) => d.device_type === "LOCK" && d.lock_state !== "LOCKED"
  );

  const openDoors = allDevices.filter(
    (d) =>
      (d.device_type === "DOOR" || d.device_type === "OTHER") &&
      (d.door_state === "OPEN" || d.open_percent > 0)
  );

  return {
    checked_at: new Date().toISOString(),
    all_secure: unlockedLocks.length === 0 && openDoors.length === 0,
    unlocked_locks: unlockedLocks,
    open_doors: openDoors,
  };
}
