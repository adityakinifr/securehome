import type { Device, CameraEvent } from "@/types/device";
import type { DeviceAdapter } from "./types";

/**
 * Schlage cloud adapter.
 *
 * pyschlage uses Allegion's cloud API (AWS Cognito for auth, REST for device control).
 * We replicate the same calls here. The Cognito User Pool and Client ID are the
 * same ones the Schlage Home app uses.
 *
 * Auth flow: Cognito USER_PASSWORD_AUTH → access token → REST API calls.
 */

const COGNITO_USER_POOL_ID = "us-east-1_eWzCndKpY";
const COGNITO_CLIENT_ID = "t5836cptp2s1il0v96g7gms9n";
const COGNITO_REGION = "us-east-1";
const API_BASE = "https://api.allegion.yonomi.co/v1";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function authenticate(): Promise<string> {
  if (cachedToken && Date.now() / 1000 < cachedToken.expiresAt - 60) {
    return cachedToken.token;
  }

  const username = process.env.SCHLAGE_USERNAME;
  const password = process.env.SCHLAGE_PASSWORD;
  if (!username || !password) {
    throw new Error("SCHLAGE_USERNAME and SCHLAGE_PASSWORD are required");
  }

  const res = await fetch(
    `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
      },
      body: JSON.stringify({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Schlage auth failed: ${err}`);
  }

  const data = await res.json();
  const result = data.AuthenticationResult;
  cachedToken = {
    token: result.AccessToken,
    expiresAt: Math.floor(Date.now() / 1000) + result.ExpiresIn,
  };
  return cachedToken.token;
}

async function apiGet(path: string): Promise<any> {
  const token = await authenticate();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Schlage API error: ${res.status}`);
  return res.json();
}

async function apiPut(path: string, body: any): Promise<any> {
  const token = await authenticate();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Schlage API error: ${res.status}`);
  return res.json();
}

function parseLock(raw: any): Device {
  const isLocked = raw.attributes?.lockState === 1;
  const isJammed = raw.attributes?.lockState === 2;

  return {
    id: raw.deviceId ?? raw.id ?? "",
    name: raw.name ?? "Schlage Lock",
    device_type: "LOCK",
    room: "",
    online: raw.connected ?? true,
    raw_traits: raw.attributes ?? {},
    lock_state: isJammed ? "JAMMED" : isLocked ? "LOCKED" : "UNLOCKED",
    door_state: "UNKNOWN",
    open_percent: 0,
  };
}

export class SchlageAdapter implements DeviceAdapter {
  name = "SchlageAdapter";

  async listDevices(): Promise<Device[]> {
    const data = await apiGet("/devices");
    const devices = Array.isArray(data) ? data : data.devices ?? [];
    return devices
      .filter((d: any) => d.type === "lock" || d.modelName?.includes("Lock"))
      .map(parseLock);
  }

  async getDevice(deviceId: string): Promise<Device | null> {
    try {
      const raw = await apiGet(`/devices/${deviceId}`);
      return parseLock(raw);
    } catch {
      return null;
    }
  }

  async lock(deviceId: string): Promise<boolean> {
    try {
      await apiPut(`/devices/${deviceId}`, {
        attributes: { lockState: 1 },
      });
      return true;
    } catch {
      return false;
    }
  }

  async unlock(deviceId: string): Promise<boolean> {
    try {
      await apiPut(`/devices/${deviceId}`, {
        attributes: { lockState: 0 },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAccessLogs(
    deviceId: string
  ): Promise<Record<string, string>[]> {
    try {
      const data = await apiGet(`/devices/${deviceId}/logs`);
      return Array.isArray(data) ? data : data.logs ?? [];
    } catch {
      return [];
    }
  }

  async getRecentEvents(): Promise<CameraEvent[]> {
    return [];
  }
}
