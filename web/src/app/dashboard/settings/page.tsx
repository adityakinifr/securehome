"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import type { HealthResponse } from "@/types/device";

interface UserSettingsForm {
  sdm_enabled: boolean;
  sdm_project_id: string;
  schlage_enabled: boolean;
  schlage_username: string;
  schlage_password: string;
  kasa_enabled: boolean;
  kasa_username: string;
  kasa_password: string;
  night_check_hour: string;
  auto_lock_enabled: boolean;
}

const defaultSettings: UserSettingsForm = {
  sdm_enabled: false,
  sdm_project_id: "",
  schlage_enabled: false,
  schlage_username: "",
  schlage_password: "",
  kasa_enabled: false,
  kasa_username: "",
  kasa_password: "",
  night_check_hour: "22:00",
  auto_lock_enabled: false,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-900 p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-400">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-blue-600" : "bg-zinc-700"}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}

function Input({ label, type = "text", value, onChange, placeholder }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data: savedSettings } = useSWR<UserSettingsForm>("/api/settings");
  const [form, setForm] = useState<UserSettingsForm>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    if (savedSettings) {
      setForm((prev) => ({ ...prev, ...savedSettings, schlage_password: "", kasa_password: "" }));
    }
  }, [savedSettings]);

  function update<K extends keyof UserSettingsForm>(key: K, value: UserSettingsForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
    } catch (e) {
      console.error("Failed to save:", e);
    }
    setSaving(false);
  }

  async function checkHealth() {
    try {
      const res = await fetch("/api/health");
      setHealth(await res.json());
    } catch {
      setHealth(null);
    }
  }

  useEffect(() => { checkHealth(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save"}
        </button>
      </div>

      {/* Google Nest / SDM */}
      <Section title="Google Nest (SDM)">
        <Toggle label="Enable Nest cameras & doorbells" checked={form.sdm_enabled} onChange={(v) => update("sdm_enabled", v)} />
        {form.sdm_enabled && (
          <Input label="SDM Project ID" value={form.sdm_project_id} onChange={(v) => update("sdm_project_id", v)} placeholder="Enter your Device Access project ID" />
        )}
        <p className="text-xs text-zinc-600">Nest access uses your Google sign-in. No extra password needed.</p>
      </Section>

      {/* Schlage */}
      <Section title="Schlage Locks">
        <Toggle label="Enable Schlage lock control" checked={form.schlage_enabled} onChange={(v) => update("schlage_enabled", v)} />
        {form.schlage_enabled && (
          <>
            <Input label="Schlage Email" value={form.schlage_username} onChange={(v) => update("schlage_username", v)} placeholder="Your Schlage Home app email" />
            <Input label="Schlage Password" type="password" value={form.schlage_password} onChange={(v) => update("schlage_password", v)} placeholder="Enter to update (leave blank to keep current)" />
          </>
        )}
      </Section>

      {/* Kasa */}
      <Section title="TP-Link Kasa / Tapo">
        <Toggle label="Enable Kasa device control" checked={form.kasa_enabled} onChange={(v) => update("kasa_enabled", v)} />
        {form.kasa_enabled && (
          <>
            <Input label="TP-Link Email" value={form.kasa_username} onChange={(v) => update("kasa_username", v)} placeholder="Your Kasa/Tapo app email" />
            <Input label="TP-Link Password" type="password" value={form.kasa_password} onChange={(v) => update("kasa_password", v)} placeholder="Enter to update (leave blank to keep current)" />
          </>
        )}
      </Section>

      {/* Preferences */}
      <Section title="Preferences">
        <Input label="Night check time (HH:MM UTC)" value={form.night_check_hour} onChange={(v) => update("night_check_hour", v)} placeholder="22:00" />
        <Toggle label="Auto-lock at night" checked={form.auto_lock_enabled} onChange={(v) => update("auto_lock_enabled", v)} />
      </Section>

      {/* Connection Status */}
      <Section title="Connection Status">
        <div className="flex items-center justify-between">
          <span className="text-sm">Server</span>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${health ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm text-zinc-400">{health ? "Connected" : "Disconnected"}</span>
          </div>
        </div>
        {health && health.adapters.length > 0 && (
          <div className="space-y-1">
            {health.adapters.map((name) => (
              <div key={name} className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                {name}
              </div>
            ))}
          </div>
        )}
        <button onClick={checkHealth} className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm transition hover:bg-zinc-700">
          Test Connection
        </button>
      </Section>

      {/* Account */}
      <Section title="Account">
        <div className="flex items-center justify-between">
          <span className="text-sm">Signed in as</span>
          <span className="text-sm text-zinc-400">{session?.user?.email ?? "—"}</span>
        </div>
      </Section>
    </div>
  );
}
