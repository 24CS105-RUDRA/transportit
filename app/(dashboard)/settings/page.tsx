"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { FormField, inputClass, buttonPrimaryClass } from "@/components/FormField";

type Settings = {
  id: string;
  depotName: string;
  currency: string;
  distanceUnit: string;
  rolePermissions: string;
  updatedAt: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({
    depotName: "",
    currency: "",
    distanceUnit: "",
    rolePermissions: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        if (res.status === 404) return { settings: null };
        return res.json();
      })
      .then((data) => {
        if (data?.settings) {
          setSettings(data.settings);
          try {
            const pretty = JSON.stringify(JSON.parse(data.settings.rolePermissions), null, 2);
            setForm({
              depotName: data.settings.depotName,
              currency: data.settings.currency,
              distanceUnit: data.settings.distanceUnit,
              rolePermissions: pretty,
            });
          } catch {
            setForm({
              depotName: data.settings.depotName,
              currency: data.settings.currency,
              distanceUnit: data.settings.distanceUnit,
              rolePermissions: data.settings.rolePermissions,
            });
          }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setError(null);
    setMessage(null);
    let rolePermissions = form.rolePermissions;
    try {
      rolePermissions = JSON.stringify(JSON.parse(form.rolePermissions));
    } catch {
      setError("Role Permissions must be valid JSON");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        depotName: form.depotName,
        currency: form.currency,
        distanceUnit: form.distanceUnit,
        rolePermissions,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save settings");
      return;
    }
    setSettings(data.settings);
    setMessage("Settings saved successfully");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">System Settings</h1>
        <p className="mt-2 text-lg text-zinc-600">Configure depot and system parameters</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : !settings ? (
        <p className="text-sm text-zinc-500">No settings found.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">Depot Configuration</h2>
            <FormField label="Depot Name">
              <input className={inputClass} value={form.depotName} onChange={(e) => setForm({ ...form, depotName: e.target.value })} />
            </FormField>
            <FormField label="Currency">
              <input className={inputClass} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="USD" />
            </FormField>
            <FormField label="Distance Unit">
              <select className={inputClass} value={form.distanceUnit} onChange={(e) => setForm({ ...form, distanceUnit: e.target.value })}>
                <option value="km">km</option>
                <option value="mi">mi</option>
              </select>
            </FormField>
            <button onClick={save} disabled={saving} className={buttonPrimaryClass}>
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">Role Permissions (JSON)</h2>
            <FormField label="Editable JSON configuration">
              <textarea
                className={`${inputClass} h-64 font-mono text-xs`}
                value={form.rolePermissions}
                onChange={(e) => setForm({ ...form, rolePermissions: e.target.value })}
              />
            </FormField>
            <p className="text-xs text-zinc-500">
              Last updated: {new Date(settings.updatedAt).toLocaleString()}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
