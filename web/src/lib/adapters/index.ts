import type { DeviceAdapter } from "./types";
import { SDMAdapter } from "./sdm";
import { SchlageAdapter } from "./schlage";
import { KasaAdapter } from "./kasa";

/**
 * Build the list of active adapters.
 * SDM requires a per-user access token (from NextAuth session).
 * Schlage and Kasa use server-side env var credentials.
 */
export function buildAdapters(sdmAccessToken?: string): DeviceAdapter[] {
  const adapters: DeviceAdapter[] = [];

  // SDM (requires user's OAuth token)
  if (sdmAccessToken && process.env.SDM_PROJECT_ID) {
    try {
      adapters.push(new SDMAdapter(sdmAccessToken));
    } catch (e) {
      console.error("Failed to init SDM adapter:", e);
    }
  }

  // Schlage (server credentials)
  if (process.env.SCHLAGE_USERNAME && process.env.SCHLAGE_PASSWORD) {
    try {
      adapters.push(new SchlageAdapter());
    } catch (e) {
      console.error("Failed to init Schlage adapter:", e);
    }
  }

  // Kasa (server credentials)
  if (process.env.KASA_USERNAME && process.env.KASA_PASSWORD) {
    try {
      adapters.push(new KasaAdapter());
    } catch (e) {
      console.error("Failed to init Kasa adapter:", e);
    }
  }

  return adapters;
}

export type { DeviceAdapter };
