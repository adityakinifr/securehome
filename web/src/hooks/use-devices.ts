import useSWR from "swr";
import type { Device } from "@/types/device";

export function useDevices() {
  const { data, error, isLoading, mutate } = useSWR<Device[]>("/api/devices");
  return {
    devices: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    locks: (data ?? []).filter((d) => d.device_type === "LOCK"),
    cameras: (data ?? []).filter(
      (d) => d.device_type === "CAMERA" || d.device_type === "DOORBELL"
    ),
    lights: (data ?? []).filter((d) => d.device_type === "LIGHT"),
    others: (data ?? []).filter(
      (d) =>
        !["LOCK", "CAMERA", "DOORBELL", "LIGHT"].includes(d.device_type)
    ),
  };
}
