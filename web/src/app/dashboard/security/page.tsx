"use client";

import { useState } from "react";
import { useNightCheck } from "@/hooks/use-night-check";
import { useDevices } from "@/hooks/use-devices";

export default function SecurityPage() {
  const { nightCheck, refresh: refreshCheck } = useNightCheck();
  const { locks, refresh: refreshDevices } = useDevices();
  const [isChecking, setIsChecking] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  const isSecure = nightCheck?.all_secure ?? true;

  async function runCheck() {
    setIsChecking(true);
    await refreshCheck();
    setIsChecking(false);
  }

  async function lockAll() {
    setIsLocking(true);
    await fetch("/api/night-check/lock-all", { method: "POST" });
    await refreshCheck();
    await refreshDevices();
    setIsLocking(false);
  }

  async function lockOne(deviceId: string) {
    await fetch(`/api/devices/${deviceId}/lock`, { method: "POST" });
    await refreshCheck();
    await refreshDevices();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Security Check</h1>

      {/* Status */}
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-zinc-900 py-10">
        <svg
          className={`h-16 w-16 ${isSecure ? "text-green-500" : "text-red-500"}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={isSecure
            ? "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            : "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          } />
        </svg>
        <h2 className="text-xl font-semibold">{isSecure ? "All Secure" : "Issues Found"}</h2>
        {nightCheck && (
          <p className="text-sm text-zinc-500">
            Last checked: {nightCheck.checked_at.replace("T", " ").slice(0, 19)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={runCheck}
          disabled={isChecking}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isChecking ? "Checking..." : "Run Check"}
        </button>
        {nightCheck && !nightCheck.all_secure && (
          <button
            onClick={lockAll}
            disabled={isLocking}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium transition hover:bg-green-700 disabled:opacity-50"
          >
            {isLocking ? "Locking..." : "Lock All"}
          </button>
        )}
      </div>

      {/* Issues */}
      {nightCheck && !nightCheck.all_secure && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-400">Issues</h3>
          {nightCheck.unlocked_locks.map((lock) => (
            <div key={lock.id} className="flex items-center gap-3 rounded-lg bg-red-950/30 p-4">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <div className="flex-1">
                <div className="text-sm font-medium">{lock.name}</div>
                <div className="text-xs text-red-400">Unlocked</div>
              </div>
              <button
                onClick={() => lockOne(lock.id)}
                className="rounded-lg bg-green-600/20 px-3 py-1.5 text-sm text-green-400 hover:bg-green-600/30"
              >
                Lock
              </button>
            </div>
          ))}
          {nightCheck.open_doors.map((door) => (
            <div key={door.id} className="flex items-center gap-3 rounded-lg bg-orange-950/30 p-4">
              <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
              <div className="flex-1">
                <div className="text-sm font-medium">{door.name}</div>
                <div className="text-xs text-orange-400">Open ({Math.round(door.open_percent)}%)</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All locks overview */}
      {locks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-400">All Locks</h3>
          {locks.map((lock) => (
            <div key={lock.id} className="flex items-center gap-3 rounded-lg bg-zinc-900 p-4">
              <svg className={`h-5 w-5 ${lock.lock_state === "LOCKED" ? "text-green-500" : "text-red-500"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="flex-1 text-sm">{lock.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                lock.lock_state === "LOCKED" ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"
              }`}>
                {lock.lock_state.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
