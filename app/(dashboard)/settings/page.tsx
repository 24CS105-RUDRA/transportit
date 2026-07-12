"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { FormField, inputClass, buttonPrimaryClass } from "@/components/FormField";
import { CardSkeleton } from "@/components/Skeleton";

type Settings = {
  id: string;
  depotName: string;
  currency: string;
  distanceUnit: string;
  updatedAt: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({ depotName: "", currency: "", distanceUnit: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const canEdit = userRole === "SUPER_ADMIN" || userRole === "FLEET_MANAGER";

  useEffect(() => {
    Promise.all([
      fetch("/api/settings", { credentials: "include" }),
      fetch("/api/auth/me", { credentials: "include" }).catch(() => null),
    ])
      .then(async ([settingsRes, meRes]) => {
        let sData = null;
        if (settingsRes.ok) sData = await settingsRes.json();
        if (meRes && meRes.ok) {
          const me = await meRes.json();
          setUserRole(me.user?.role ?? "");
        }
        if (sData?.settings) {
          setSettings(sData.settings);
          setForm({
            depotName: sData.settings.depotName ?? "",
            currency: sData.settings.currency ?? "",
            distanceUnit: sData.settings.distanceUnit ?? "km",
          });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setError(null);
    setMessage(null);
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        depotName: form.depotName,
        currency: form.currency,
        distanceUnit: form.distanceUnit,
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
        <p className="mt-2 text-lg text-zinc-600">Configure depot, roles, and system parameters</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !settings ? (
        <p className="text-sm text-zinc-500">No settings found.</p>
      ) : (
        <>
          <Card>
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">Depot Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Depot Name">
                <input className={inputClass} value={form.depotName} onChange={(e) => setForm({ ...form, depotName: e.target.value })} disabled={!canEdit} />
              </FormField>
              <FormField label="Currency">
                <input className={inputClass} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} disabled={!canEdit} />
              </FormField>
              <FormField label="Distance Unit">
                <select className={inputClass} value={form.distanceUnit} onChange={(e) => setForm({ ...form, distanceUnit: e.target.value })} disabled={!canEdit}>
                  <option value="km">km</option>
                  <option value="mi">mi</option>
                </select>
              </FormField>
            </div>
            {canEdit && (
              <button onClick={save} disabled={saving} className={buttonPrimaryClass}>
                {saving ? "Saving…" : "Save Settings"}
              </button>
            )}
            {!canEdit && (
              <p className="text-xs text-zinc-400 mt-2">Only Super Admin and Fleet Manager can edit settings.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
