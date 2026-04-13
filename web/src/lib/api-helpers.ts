import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildAdapters } from "./adapters";
import { getUserSettings } from "./db/user-settings";
import type { DeviceAdapter } from "./adapters/types";

/**
 * Get authenticated adapters for an API route.
 * Loads per-user settings from the database and builds adapters accordingly.
 */
export async function getAdapters(): Promise<DeviceAdapter[]> {
  const session = await auth();
  const sdmToken = session?.accessToken;
  const userId = session?.user?.id || session?.user?.email || "";

  let userSettings = null;
  if (userId) {
    try {
      userSettings = await getUserSettings(userId);
    } catch {
      // DB not available — fall back to env vars
    }
  }

  return buildAdapters(sdmToken, userSettings);
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
