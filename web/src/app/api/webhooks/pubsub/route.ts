import { NextRequest } from "next/server";
import { json, errorResponse } from "@/lib/api-helpers";
import { addEvent } from "@/lib/services/event-store";
import type { CameraEvent, EventType } from "@/types/device";

const EVENT_TYPE_MAP: Record<string, EventType> = {
  "sdm.devices.events.CameraPerson.Person": "PERSON",
  "sdm.devices.events.CameraMotion.Motion": "MOTION",
  "sdm.devices.events.CameraSound.Sound": "SOUND",
  "sdm.devices.events.DoorbellChime.Chime": "DOORBELL",
};

function parseSdmEvent(data: any): CameraEvent | null {
  const resourceUpdate = data.resourceUpdate ?? {};
  const deviceName: string = resourceUpdate.name ?? "";
  const deviceId = deviceName.includes("/")
    ? deviceName.split("/").pop()!
    : deviceName;

  const events = resourceUpdate.events ?? {};
  for (const [sdmType, ourType] of Object.entries(EVENT_TYPE_MAP)) {
    if (sdmType in events) {
      const eventData = events[sdmType];
      return {
        device_id: deviceId,
        device_name: "",
        event_type: ourType,
        timestamp: data.timestamp ?? new Date().toISOString(),
        event_id: eventData.eventId ?? "",
        image_url: "",
      };
    }
  }
  return null;
}

/**
 * Google Cloud Pub/Sub push endpoint.
 * Pub/Sub sends a POST with { message: { data: base64(...), messageId, publishTime } }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messageData = body.message?.data;
    if (!messageData) {
      return errorResponse("No message data", 400);
    }

    const decoded = JSON.parse(
      Buffer.from(messageData, "base64").toString("utf-8")
    );
    const event = parseSdmEvent(decoded);

    if (event) {
      addEvent(event);
      console.log(`Camera event: ${event.event_type} on ${event.device_id}`);
    }

    return json({ status: "ok" });
  } catch (e) {
    console.error("Pub/Sub webhook error:", e);
    return errorResponse("Failed to process webhook", 500);
  }
}
