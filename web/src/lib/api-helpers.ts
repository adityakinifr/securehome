import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildAdapters } from "./adapters";
import type { DeviceAdapter } from "./adapters/types";

/**
 * Get authenticated adapters for an API route.
 * Extracts the SDM access token from the NextAuth session.
 */
export async function getAdapters(): Promise<DeviceAdapter[]> {
  const session = await auth();
  const sdmToken = session?.accessToken;
  return buildAdapters(sdmToken);
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
