import useSWR from "swr";
import type { NightCheckResult } from "@/types/device";

export function useNightCheck() {
  const { data, error, isLoading, mutate } =
    useSWR<NightCheckResult>("/api/night-check");
  return {
    nightCheck: data ?? null,
    isLoading,
    error,
    refresh: mutate,
  };
}
