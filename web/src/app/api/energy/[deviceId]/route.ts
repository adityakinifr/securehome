import { getAdapters, json, errorResponse } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;
  const adapters = await getAdapters();

  for (const adapter of adapters) {
    if (adapter.getEnergyUsage) {
      const usage = await adapter.getEnergyUsage(deviceId);
      if (usage) {
        return json({ device_id: deviceId, usage });
      }
    }
  }

  return errorResponse("No energy data available", 404);
}
