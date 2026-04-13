export type DeviceType =
  | "LOCK"
  | "CAMERA"
  | "DOORBELL"
  | "THERMOSTAT"
  | "LIGHT"
  | "SENSOR"
  | "DOOR"
  | "OTHER";

export type LockState = "LOCKED" | "UNLOCKED" | "JAMMED" | "UNKNOWN";
export type DoorState = "OPEN" | "CLOSED" | "UNKNOWN";

export interface Device {
  id: string;
  name: string;
  device_type: DeviceType;
  room: string;
  online: boolean;
  raw_traits: Record<string, unknown>;
  lock_state: LockState;
  door_state: DoorState;
  open_percent: number;
}

export interface NightCheckResult {
  checked_at: string;
  all_secure: boolean;
  unlocked_locks: Device[];
  open_doors: Device[];
}

export interface VisitorSummary {
  date: string;
  total_person_events: number;
  total_doorbell_presses: number;
  total_motion_events: number;
  events: CameraEvent[];
}

export type EventType = "PERSON" | "MOTION" | "SOUND" | "DOORBELL";

export interface CameraEvent {
  device_id: string;
  device_name: string;
  event_type: EventType;
  timestamp: string;
  event_id: string;
  image_url: string;
}

export interface ActionResponse {
  status: string;
  device_id: string;
}

export interface HealthResponse {
  status: string;
  adapters: string[];
}
