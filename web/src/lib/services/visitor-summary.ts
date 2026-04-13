import type { VisitorSummary } from "@/types/device";
import { getTodayEvents } from "./event-store";

export function generateVisitorSummary(): VisitorSummary {
  const events = getTodayEvents();
  const today = new Date().toISOString().slice(0, 10);

  const personEvents = events.filter((e) => e.event_type === "PERSON");
  const doorbellEvents = events.filter((e) => e.event_type === "DOORBELL");
  const motionEvents = events.filter((e) => e.event_type === "MOTION");

  return {
    date: today,
    total_person_events: personEvents.length,
    total_doorbell_presses: doorbellEvents.length,
    total_motion_events: motionEvents.length,
    events: [...personEvents, ...doorbellEvents],
  };
}
