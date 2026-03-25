"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { HealthResponse } from "@/types/device";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checking, setChecking] = useState(false);

  async function checkHealth() {
    setChecking(true);
    try {
      const res = await fetch("/api/health");
      setHealth(await res.json());
    } catch {
      setHealth(null);
    }
    setChecking(false);
  }

  useEffect(() => {
    checkHealth();
  }, []);

  const adapterIcon = (name: string) => {
    if (name.includes("SDM")) return "text-blue-500";
    if (name.includes("Schlage")) return "text-green-500";
    if (name.includes("Kasa")) return "text-yellow-500";
    return "text-zinc-500";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Connection */}
      <div className="rounded-xl bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-400">Server Status</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">Connection</span>
          <div className="flex items-center gap-2">
            {health ? (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-400">Connected</span>
              </>
            ) : (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm text-red-400">Disconnected</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={checkHealth}
          disabled={checking}
          className="mt-3 w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm transition hover:bg-zinc-700 disabled:opacity-50"
        >
          {checking ? "Checking..." : "Test Connection"}
        </button>
      </div>

      {/* Adapters */}
      {health && (
        <div className="rounded-xl bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-400">Active Adapters</h2>
          {health.adapters.length > 0 ? (
            <div className="space-y-2">
              {health.adapters.map((name) => (
                <div key={name} className="flex items-center gap-3 rounded-lg bg-zinc-800 p-3">
                  <span className={`inline-block h-2 w-2 rounded-full ${adapterIcon(name).replace("text-", "bg-")}`} />
                  <span className="text-sm">{name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No adapters configured</p>
          )}
        </div>
      )}

      {/* Account */}
      <div className="rounded-xl bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-400">Account</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">Signed in as</span>
          <span className="text-sm text-zinc-400">{session?.user?.email ?? "—"}</span>
        </div>
      </div>

      {/* About */}
      <div className="rounded-xl bg-zinc-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-400">About</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">Version</span>
          <span className="text-sm text-zinc-500">0.1.0</span>
        </div>
      </div>
    </div>
  );
}
