import { getAdapters, json, errorResponse } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;
  const adapters = await getAdapters();

  for (const adapter of adapters) {
    if (adapter.getAccessLogs) {
      const logs = await adapter.getAccessLogs(deviceId);
      if (logs.length > 0) {
        return json({ device_id: deviceId, logs });
      }
    }
  }

  return errorResponse("No lock history available", 404);
}
