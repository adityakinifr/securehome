import type { CameraEvent, Device } from "@/types/device";

export interface DeviceAdapter {
  name: string;
  listDevices(): Promise<Device[]>;
  getDevice(deviceId: string): Promise<Device | null>;
  lock(deviceId: string): Promise<boolean>;
  unlock(deviceId: string): Promise<boolean>;
  turnOn?(deviceId: string): Promise<boolean>;
  turnOff?(deviceId: string): Promise<boolean>;
  getEnergyUsage?(deviceId: string): Promise<Record<string, unknown> | null>;
  getAccessLogs?(deviceId: string): Promise<Record<string, string>[]>;
  getRecentEvents(hours?: number): Promise<CameraEvent[]>;
}
