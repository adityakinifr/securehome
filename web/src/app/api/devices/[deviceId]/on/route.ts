import { getAdapters, json, errorResponse } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;
  const adapters = await getAdapters();

  for (const adapter of adapters) {
    if (adapter.turnOn && (await adapter.turnOn(deviceId))) {
      return json({ status: "on", device_id: deviceId });
    }
  }

  return errorResponse("Device not found or turn_on not supported", 404);
}
