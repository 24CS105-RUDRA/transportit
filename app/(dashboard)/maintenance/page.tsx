"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { FormField, inputClass, buttonPrimaryClass, buttonSecondaryClass } from "@/components/FormField";
import { StatusBadge } from "@/components/Badge";
import { Toast } from "@/components/Toast";
import { TableSkeleton } from "@/components/Skeleton";
import { useToast } from "@/lib/useToast";
import { formatCurrency } from "@/lib/format";

type Vehicle = { id: string; registrationNumber: string; nameModel: string };
type MaintenanceLog = {
  id: string;
  serviceType: string;
  servicerName: string | null;
  cost: number;
  date: string;
  status: string;
  vehicle?: Vehicle | null;
};

export default function MaintenancePage() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast, clearToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    vehicleId: "",
    serviceType: "",
    servicerName: "",
    cost: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [editing, setEditing] = useState<MaintenanceLog | null>(null);

  const load = useCallback(async () => {
    try {
      const [l, v] = await Promise.all([
        fetch("/api/maintenance", { credentials: "include" }),
        fetch("/api/vehicles", { credentials: "include" }),
      ]);
      if (l.status === 401) {
        window.location.href = "/login";
        return;
      }
      const [ld, vd] = await Promise.all([l.json(), v.json()]);
      setLogs(ld.logs);
      setVehicles(vd.vehicles);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function createLog() {
    setError(null);
    const url = editing ? `/api/maintenance/${editing.id}` : "/api/maintenance";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId: form.vehicleId,
        serviceType: form.serviceType,
        servicerName: form.servicerName || undefined,
        cost: Number(form.cost),
        date: form.date,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Failed to save maintenance log", "error");
      return;
    }
    setCreateOpen(false);
    setEditing(null);
    setForm({ vehicleId: "", serviceType: "", servicerName: "", cost: "", date: new Date().toISOString().slice(0, 10) });
    showToast(editing ? "Maintenance log updated" : "Maintenance log created — vehicle moved to IN_SHOP");
    load();
  }

  function openEdit(log: MaintenanceLog) {
    setEditing(log);
    setForm({
      vehicleId: log.vehicle?.id ?? "",
      serviceType: log.serviceType,
      servicerName: log.servicerName ?? "",
      cost: String(log.cost),
      date: log.date.slice(0, 10),
    });
    setCreateOpen(true);
  }

  async function closeLog(id: string) {
    const res = await fetch(`/api/maintenance/${id}/close`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Failed to close maintenance log", "error");
      return;
    }
    showToast("Maintenance log closed — vehicle back to AVAILABLE");
    load();
  }

  const totalCost = logs.reduce((a, l) => a + l.cost, 0);
  const activeCount = logs.filter((l) => l.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Maintenance Management</h1>
          <p className="mt-2 text-lg text-zinc-600">Vehicle service logs and maintenance tracking</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className={buttonPrimaryClass}>
          + Log Maintenance
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <h2 className="text-sm font-medium text-zinc-500">Total Logs</h2>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{logs.length}</p>
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-zinc-500">Active (In Shop)</h2>
          <p className="mt-1 text-2xl font-semibold text-orange-600">{activeCount}</p>
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-zinc-500">Total Cost</h2>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {formatCurrency(totalCost)}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">Service History</h2>
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-4">Vehicle</th>
                  <th className="py-2 pr-4">Service</th>
                  <th className="py-2 pr-4">Servicer</th>
                  <th className="py-2 pr-4">Cost</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-4 font-medium text-zinc-900">
                      {l.vehicle?.registrationNumber ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-zinc-600">{l.serviceType}</td>
                    <td className="py-2 pr-4 text-zinc-600">{l.servicerName ?? "—"}</td>
                      <td className="py-2 pr-4 text-zinc-600">{formatCurrency(l.cost)}</td>
                    <td className="py-2 pr-4 text-zinc-600">
                      {new Date(l.date).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="py-2 pr-4">
                      {l.status === "ACTIVE" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(l)}
                            className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => closeLog(l.id)}
                            className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            Mark Complete
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-zinc-500">
                      No maintenance logs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setEditing(null); }} title={editing ? "Edit Maintenance Log" : "Log Maintenance"}>
        <FormField label="Vehicle">
          <select className={inputClass} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registrationNumber} — {v.nameModel}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Service Type">
          <input className={inputClass} value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} placeholder="e.g. Oil Change" />
        </FormField>
        <FormField label="Servicer Name (optional)">
          <input className={inputClass} value={form.servicerName} onChange={(e) => setForm({ ...form, servicerName: e.target.value })} />
        </FormField>
        <FormField label="Cost">
          <input type="number" className={inputClass} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </FormField>
        <FormField label="Date">
          <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setCreateOpen(false)} className={buttonSecondaryClass}>
            Cancel
          </button>
          <button onClick={createLog} className={buttonPrimaryClass}>
            Create
          </button>
        </div>
      </Modal>
    </div>
  );
}
