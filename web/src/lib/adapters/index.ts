import type { DeviceAdapter } from "./types";
import type { UserSettings } from "../db/schema";
import { SDMAdapter } from "./sdm";
import { SchlageAdapter } from "./schlage";
import { KasaAdapter } from "./kasa";

/**
 * Build adapters from per-user settings stored in the database.
 * Falls back to env vars if no user settings exist (backwards compatible).
 */
export function buildAdapters(
  sdmAccessToken?: string,
  userSettings?: UserSettings | null
): DeviceAdapter[] {
  const adapters: DeviceAdapter[] = [];

  // SDM — requires user's OAuth token + project ID
  const sdmProjectId =
    userSettings?.sdmProjectId || process.env.SDM_PROJECT_ID;
  const sdmEnabled = userSettings?.sdmEnabled ?? !!process.env.SDM_PROJECT_ID;
  if (sdmAccessToken && sdmProjectId && sdmEnabled) {
    try {
      adapters.push(new SDMAdapter(sdmAccessToken, sdmProjectId));
    } catch (e) {
      console.error("Failed to init SDM adapter:", e);
    }
  }

  // Schlage
  const schlageUser =
    userSettings?.schlageUsername || process.env.SCHLAGE_USERNAME;
  const schlagePass =
    userSettings?.schlagePassword || process.env.SCHLAGE_PASSWORD;
  const schlageEnabled =
    userSettings?.schlageEnabled ??
    !!(process.env.SCHLAGE_USERNAME && process.env.SCHLAGE_PASSWORD);
  if (schlageUser && schlagePass && schlageEnabled) {
    try {
      adapters.push(new SchlageAdapter(schlageUser, schlagePass));
    } catch (e) {
      console.error("Failed to init Schlage adapter:", e);
    }
  }

  // Kasa
  const kasaUser = userSettings?.kasaUsername || process.env.KASA_USERNAME;
  const kasaPass = userSettings?.kasaPassword || process.env.KASA_PASSWORD;
  const kasaEnabled =
    userSettings?.kasaEnabled ??
    !!(process.env.KASA_USERNAME && process.env.KASA_PASSWORD);
  if (kasaUser && kasaPass && kasaEnabled) {
    try {
      adapters.push(new KasaAdapter(kasaUser, kasaPass));
    } catch (e) {
      console.error("Failed to init Kasa adapter:", e);
    }
  }

  return adapters;
}

export type { DeviceAdapter };
