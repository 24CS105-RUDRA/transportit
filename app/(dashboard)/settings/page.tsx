"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/Card";
import { FormField, inputClass, buttonPrimaryClass } from "@/components/FormField";
import { CardSkeleton } from "@/components/Skeleton";

type Settings = {
  id: string;
  depotName: string;
  currency: string;
  distanceUnit: string;
  rolePermissions: string;
  updatedAt: string;
};

const MODULES = ["dashboard", "fleet", "drivers", "trips", "maintenance", "fuelExpenses", "analytics", "settings", "safety", "audit"];
const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  fleet: "Fleet Management",
  drivers: "Driver Management",
  trips: "Trip Dispatcher",
  maintenance: "Maintenance",
  fuelExpenses: "Fuel & Expenses",
  analytics: "Analytics",
  settings: "System Settings",
  safety: "Safety",
  audit: "Audit Log",
};
const ROLES = ["SUPER_ADMIN", "FLEET_MANAGER", "DISPATCHER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"];
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  FLEET_MANAGER: "Fleet Manager",
  DISPATCHER: "Dispatcher",
  SAFETY_OFFICER: "Safety Officer",
  FINANCIAL_ANALYST: "Financial Analyst",
};
const DEFAULT_ACCESS: Record<string, string[]> = {
  SUPER_ADMIN: [...MODULES],
  FLEET_MANAGER: ["dashboard", "fleet", "maintenance", "analytics", "settings", "audit"],
  DISPATCHER: ["dashboard", "trips", "audit"],
  SAFETY_OFFICER: ["dashboard", "drivers", "safety"],
  FINANCIAL_ANALYST: ["dashboard", "fuelExpenses", "analytics"],
};

function sanitizeAccess(raw: unknown): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
  for (const [role, val] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(val)) {
      result[role] = val.filter((v) => typeof v === "string" && MODULES.includes(v));
    } else if (typeof val === "string") {
      result[role] = val.split(",").map((s) => s.trim()).filter((s) => MODULES.includes(s));
    }
  }
  return result;
}

function getAccess(access: Record<string, string[]>, role: string, mod: string): boolean {
  const arr = access[role];
  return Array.isArray(arr) && arr.includes(mod);
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({ depotName: "", currency: "", distanceUnit: "" });
  const [access, setAccess] = useState<Record<string, string[]>>(() => ({ ...DEFAULT_ACCESS }));
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
          try {
            const parsed = JSON.parse(sData.settings.rolePermissions ?? "{}");
            const fixed = sanitizeAccess(parsed);
            if (Object.keys(fixed).length > 0) {
              setAccess((prev) => ({ ...prev, ...fixed }));
            }
          } catch {
            // keep defaults
          }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleModule = useCallback((role: string, mod: string) => {
    if (!canEdit) return;
    setAccess((prev) => {
      const current = Array.isArray(prev[role]) ? [...prev[role]] : [];
      const idx = current.indexOf(mod);
      const next = idx >= 0 ? current.filter((m) => m !== mod) : [...current, mod];
      return { ...prev, [role]: next };
    });
  }, [canEdit]);

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
        rolePermissions: JSON.stringify(access),
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

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-zinc-900">Role Permissions</h2>
              {canEdit && (
                <span className="text-xs text-emerald-600 font-medium">Click checkboxes to toggle access</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-2 pr-4 min-w-[160px]">Module</th>
                    {ROLES.map((r) => (
                      <th key={r} className="py-2 px-3 text-center min-w-[100px]">
                        <span className="text-xs">{ROLE_LABELS[r]}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod) => (
                    <tr key={mod} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-zinc-900">{MODULE_LABELS[mod]}</td>
                      {ROLES.map((r) => {
                        const hasAccess = getAccess(access, r, mod);
                        return (
                          <td key={r} className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => toggleModule(r, mod)}
                              disabled={!canEdit}
                              className={`inline-flex h-5 w-5 items-center justify-center rounded border transition-all ${
                                hasAccess
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-zinc-300 bg-white text-transparent hover:border-zinc-400"
                              } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                            >
                              {hasAccess && (
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Last updated: {new Date(settings.updatedAt).toLocaleString()}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
