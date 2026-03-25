import { useState } from "react";
import { useDevices } from "./use-devices";

export function useDeviceAction() {
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useDevices();

  async function perform(
    deviceId: string,
    action: "lock" | "unlock" | "on" | "off"
  ) {
    setIsLoading(true);
    try {
      await fetch(`/api/devices/${deviceId}/${action}`, { method: "POST" });
      await refresh();
    } catch (e) {
      console.error(`Failed to ${action} device ${deviceId}:`, e);
    }
    setIsLoading(false);
  }

  return { perform, isLoading };
}
