import type { CameraEvent, EventType } from "@/types/device";

/**
 * In-memory event store for serverless.
 *
 * In production with Vercel KV, replace this with Redis-backed storage.
 * For now, events are stored in module-level state (reset on cold start).
 * This still works for the Pub/Sub webhook within a single function instance.
 *
 * To use Vercel KV, install @vercel/kv and replace the array operations
 * with ZADD/ZRANGEBYSCORE calls.
 */

let events: CameraEvent[] = [];

export function addEvent(event: CameraEvent): void {
  events.push(event);
}

export function getTodayEvents(): CameraEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return events
    .filter((e) => e.timestamp.startsWith(today))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function getEvents(opts?: {
  since?: string;
  eventType?: EventType;
}): CameraEvent[] {
  let result = [...events];
  if (opts?.since) {
    result = result.filter((e) => e.timestamp >= opts.since!);
  }
  if (opts?.eventType) {
    result = result.filter((e) => e.event_type === opts.eventType);
  }
  return result.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function pruneEvents(olderThanHours: number = 48): number {
  const cutoff = new Date(
    Date.now() - olderThanHours * 60 * 60 * 1000
  ).toISOString();
  const before = events.length;
  events = events.filter((e) => e.timestamp >= cutoff);
  return before - events.length;
}
