import { getAdapters, json, errorResponse } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;
  const adapters = await getAdapters();

  for (const adapter of adapters) {
    const dev = await adapter.getDevice(deviceId);
    if (dev) return json(dev);
  }

  return errorResponse("Device not found", 404);
}
