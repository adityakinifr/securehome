import useSWR from "swr";
import type { VisitorSummary } from "@/types/device";

export function useVisitorSummary() {
  const { data, error, isLoading, mutate } =
    useSWR<VisitorSummary>("/api/summary");
  return {
    summary: data ?? null,
    isLoading,
    error,
    refresh: mutate,
  };
}
