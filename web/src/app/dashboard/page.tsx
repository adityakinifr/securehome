"use client";

import { useDevices } from "@/hooks/use-devices";
import { useNightCheck } from "@/hooks/use-night-check";
import { useVisitorSummary } from "@/hooks/use-visitor-summary";
import { useDeviceAction } from "@/hooks/use-device-action";
import type { Device } from "@/types/device";

const DEVICE_ICONS: Record<string, string> = {
  LOCK: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  CAMERA: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  DOORBELL: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  LIGHT: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  OTHER: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z",
};

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-zinc-900 p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{title}</div>
    </div>
  );
}

function DeviceChip({ device }: { device: Device }) {
  const { perform } = useDeviceAction();
  const icon = DEVICE_ICONS[device.device_type] ?? DEVICE_ICONS.OTHER;

  const statusColor =
    !device.online ? "text-zinc-600" :
    device.device_type === "LOCK" && device.lock_state === "LOCKED" ? "text-green-500" :
    device.device_type === "LOCK" ? "text-red-500" :
    "text-blue-500";

  function handleClick() {
    if (device.device_type === "LOCK") {
      perform(device.id, device.lock_state === "LOCKED" ? "unlock" : "lock");
    } else if (device.device_type === "LIGHT") {
      perform(device.id, "on");
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center gap-2 rounded-xl bg-zinc-900 p-4 transition hover:bg-zinc-800"
      style={{ minWidth: 100 }}
    >
      <svg className={`h-6 w-6 ${statusColor}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
      <span className="text-xs truncate max-w-[80px]">{device.name}</span>
      <span className="text-[10px] text-zinc-500">
        {!device.online ? "Offline" :
         device.device_type === "LOCK" ? device.lock_state.toLowerCase() :
         "Online"}
      </span>
    </button>
  );
}

export default function DashboardPage() {
  const { devices, locks, cameras, lights, isLoading } = useDevices();
  const { nightCheck } = useNightCheck();
  const { summary } = useVisitorSummary();

  const isSecure = nightCheck?.all_secure ?? true;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Security banner */}
      <div className={`flex items-center gap-4 rounded-2xl p-6 ${isSecure ? "bg-green-950/50" : "bg-red-950/50"}`}>
        <svg className={`h-10 w-10 ${isSecure ? "text-green-500" : "text-red-500"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d={isSecure
            ? "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            : "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          } />
        </svg>
        <div>
          <h2 className="text-lg font-semibold">{isSecure ? "Home Secure" : "Attention Needed"}</h2>
          <p className="text-sm text-zinc-400">
            {isSecure
              ? "All locks secured, all doors closed"
              : `${(nightCheck?.unlocked_locks.length ?? 0) + (nightCheck?.open_doors.length ?? 0)} issue(s) found`}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard title="Devices" value={`${devices.length}`} color="text-blue-400" />
        <StatCard title="Locks" value={`${locks.length}`} color={locks.some(l => l.lock_state !== "LOCKED") ? "text-red-400" : "text-green-400"} />
        <StatCard title="Cameras" value={`${cameras.length}`} color="text-purple-400" />
        <StatCard title="Visitors" value={`${summary?.total_person_events ?? 0}`} color="text-orange-400" />
      </div>

      {/* Device groups */}
      {locks.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-400">Locks</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {locks.map((d) => <DeviceChip key={d.id} device={d} />)}
          </div>
        </div>
      )}

      {lights.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-400">Lights</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {lights.map((d) => <DeviceChip key={d.id} device={d} />)}
          </div>
        </div>
      )}

      {cameras.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-400">Cameras</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {cameras.map((d) => <DeviceChip key={d.id} device={d} />)}
          </div>
        </div>
      )}

      {isLoading && devices.length === 0 && (
        <div className="py-20 text-center text-zinc-500">Loading devices...</div>
      )}
    </div>
  );
}
