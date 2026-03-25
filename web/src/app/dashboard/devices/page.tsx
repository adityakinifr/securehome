"use client";

import { useState } from "react";
import { useDevices } from "@/hooks/use-devices";
import { useDeviceAction } from "@/hooks/use-device-action";
import type { Device } from "@/types/device";

function LockRow({ device }: { device: Device }) {
  const { perform, isLoading } = useDeviceAction();
  const isLocked = device.lock_state === "LOCKED";

  return (
    <div className="flex items-center gap-4 rounded-lg bg-zinc-900 p-4">
      <svg className={`h-5 w-5 ${isLocked ? "text-green-500" : "text-red-500"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <div className="flex-1">
        <div className="font-medium">{device.name}</div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${device.online ? "bg-green-500" : "bg-red-500"}`} />
          {device.lock_state.toLowerCase()}
          {device.room && <span> &middot; {device.room}</span>}
        </div>
      </div>
      <button
        onClick={() => perform(device.id, isLocked ? "unlock" : "lock")}
        disabled={isLoading}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          isLocked
            ? "bg-orange-600/20 text-orange-400 hover:bg-orange-600/30"
            : "bg-green-600/20 text-green-400 hover:bg-green-600/30"
        }`}
      >
        {isLocked ? "Unlock" : "Lock"}
      </button>
    </div>
  );
}

function ToggleRow({ device }: { device: Device }) {
  const { perform, isLoading } = useDeviceAction();

  return (
    <div className="flex items-center gap-4 rounded-lg bg-zinc-900 p-4">
      <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <div className="flex-1">
        <div className="font-medium">{device.name}</div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${device.online ? "bg-green-500" : "bg-red-500"}`} />
          {device.online ? "Online" : "Offline"}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => perform(device.id, "on")}
          disabled={isLoading}
          className="rounded-lg bg-green-600/20 px-3 py-1.5 text-sm text-green-400 hover:bg-green-600/30"
        >
          On
        </button>
        <button
          onClick={() => perform(device.id, "off")}
          disabled={isLoading}
          className="rounded-lg bg-red-600/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-600/30"
        >
          Off
        </button>
      </div>
    </div>
  );
}

function DeviceRow({ device }: { device: Device }) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-zinc-900 p-4">
      <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <div className="flex-1">
        <div className="font-medium">{device.name}</div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${device.online ? "bg-green-500" : "bg-red-500"}`} />
          {device.online ? "Online" : "Offline"}
          {device.room && <span> &middot; {device.room}</span>}
        </div>
      </div>
      <span className="text-xs text-zinc-600">{device.device_type}</span>
    </div>
  );
}

export default function DevicesPage() {
  const { locks, cameras, lights, others, isLoading, devices } = useDevices();
  const [search, setSearch] = useState("");

  const filter = (list: Device[]) =>
    search
      ? list.filter(
          (d) =>
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.room.toLowerCase().includes(search.toLowerCase())
        )
      : list;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Devices</h1>
        <span className="text-sm text-zinc-500">{devices.length} total</span>
      </div>

      <input
        type="text"
        placeholder="Search devices..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-blue-500"
      />

      {filter(locks).length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-400">Locks</h2>
          <div className="space-y-2">{filter(locks).map((d) => <LockRow key={d.id} device={d} />)}</div>
        </section>
      )}

      {filter(cameras).length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-400">Cameras & Doorbells</h2>
          <div className="space-y-2">{filter(cameras).map((d) => <DeviceRow key={d.id} device={d} />)}</div>
        </section>
      )}

      {filter(lights).length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-400">Lights & Switches</h2>
          <div className="space-y-2">{filter(lights).map((d) => <ToggleRow key={d.id} device={d} />)}</div>
        </section>
      )}

      {filter(others).length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-400">Other</h2>
          <div className="space-y-2">{filter(others).map((d) => <DeviceRow key={d.id} device={d} />)}</div>
        </section>
      )}

      {isLoading && devices.length === 0 && (
        <div className="py-20 text-center text-zinc-500">Loading devices...</div>
      )}

      {!isLoading && devices.length === 0 && (
        <div className="py-20 text-center text-zinc-500">No devices found. Check your adapter configuration.</div>
      )}
    </div>
  );
}
