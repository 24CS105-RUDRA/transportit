"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { FormField, inputClass, buttonPrimaryClass, buttonSecondaryClass } from "@/components/FormField";
import { StatusBadge } from "@/components/Badge";
import { Toast } from "@/components/Toast";
import { TableSkeleton } from "@/components/Skeleton";
import { useToast } from "@/lib/useToast";
import { formatCurrency } from "@/lib/format";

type Vehicle = { id: string; registrationNumber: string; nameModel: string; status: string };
type Driver = { id: string; name: string; licenseExpiryDate: string; status: string };
type Trip = {
  id: string;
  tripCode: string;
  source: string;
  destination: string;
  cargoWeightKg: number;
  plannedDistanceKm: number;
  status: string;
  revenue: number | null;
  cancelReason?: string | null;
  vehicle?: Vehicle | null;
  driver?: Driver | null;
};

function TripTimeline({ status }: { status: string }) {
  const steps = [
    { key: "DRAFT", label: "Created" },
    { key: "DISPATCHED", label: "Dispatched" },
    { key: "COMPLETED", label: "Completed" },
  ];
  const cancelled = status === "CANCELLED";
  const currentIdx = steps.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isActive = cancelled ? false : i <= currentIdx;
        const isCurrent = step.key === status;
        return (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center gap-1.5 ${i > 0 ? "ml-1" : ""}`}>
              <div className={`h-2.5 w-2.5 rounded-full ${
                isCurrent ? "bg-blue-600 ring-2 ring-blue-200" :
                isActive ? "bg-emerald-500" : "bg-zinc-300"
              }`} />
              <span className={`text-xs ${isCurrent ? "font-semibold text-zinc-900" : isActive ? "text-zinc-700" : "text-zinc-400"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-1 h-px w-6 ${i < currentIdx && !cancelled ? "bg-emerald-400" : "bg-zinc-200"}`} />
            )}
          </div>
        );
      })}
      {cancelled && (
        <div className="ml-1 flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="text-xs font-semibold text-rose-600">Cancelled</span>
        </div>
      )}
    </div>
  );
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast, clearToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [completeTrip, setCompleteTrip] = useState<Trip | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Trip | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [sortKey, setSortKey] = useState<string>("tripCode");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const sortedTrips = useMemo(() => {
    const arr = [...trips];
    arr.sort((a, b) => {
      let av: any = (a as any)[sortKey];
      let bv: any = (b as any)[sortKey];
      if (sortKey === "vehicle") av = a.vehicle?.registrationNumber ?? "";
      if (sortKey === "driver") av = a.driver?.name ?? "";
      if (sortKey === "vehicle") bv = b.vehicle?.registrationNumber ?? "";
      if (sortKey === "driver") bv = b.driver?.name ?? "";
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      av = av ?? 0;
      bv = bv ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [trips, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedTrips.length / pageSize));
  const pageTrips = sortedTrips.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const [form, setForm] = useState({
    source: "",
    destination: "",
    vehicleId: "",
    driverId: "",
    cargoWeightKg: "",
    plannedDistanceKm: "",
  });
  const [completeForm, setCompleteForm] = useState({
    finalOdometerKm: "",
    fuelConsumedL: "",
    fuelCost: "",
    revenue: "",
  });

  const load = useCallback(async () => {
    try {
      const [t, v, d] = await Promise.all([
        fetch("/api/trips", { credentials: "include" }),
        fetch("/api/vehicles", { credentials: "include" }),
        fetch("/api/drivers", { credentials: "include" }),
      ]);
      if (t.status === 401) {
        window.location.href = "/login";
        return;
      }
      const [td, vd, dd] = await Promise.all([t.json(), v.json(), d.json()]);
      setTrips(td.trips);
      setVehicles(vd.vehicles);
      setDrivers(dd.drivers);
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

  async function suggest() {
    setError(null);
    if (!form.cargoWeightKg) {
      setError("Enter cargo weight to get a smart suggestion");
      return;
    }
    const res = await fetch("/api/trips/suggest", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cargoWeightKg: Number(form.cargoWeightKg) }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Suggestion failed", "error");
      return;
    }
    if (!data.suggestions.length) {
      showToast(data.message ?? "No suitable vehicle/driver found", "error");
      return;
    }
    const top = data.suggestions[0];
    setForm((f) => ({ ...f, vehicleId: top.vehicle.id, driverId: top.driver.id }));
    showToast(
      `Suggested ${top.vehicle.registrationNumber} + ${top.driver.name} (${top.capacityUtilization}% capacity)`
    );
  }

  async function createTrip() {
    setError(null);
    if (!form.source.trim() || !form.destination.trim()) {
      showToast("Source and destination are required", "error");
      return;
    }
    if (!form.vehicleId) {
      showToast("Select a vehicle", "error");
      return;
    }
    if (!form.driverId) {
      showToast("Select a driver", "error");
      return;
    }
    if (!form.cargoWeightKg || Number(form.cargoWeightKg) <= 0) {
      showToast("Enter valid cargo weight", "error");
      return;
    }
    if (!form.plannedDistanceKm || Number(form.plannedDistanceKm) <= 0) {
      showToast("Enter valid distance", "error");
      return;
    }
    const res = await fetch("/api/trips", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: form.source,
        destination: form.destination,
        vehicleId: form.vehicleId,
        driverId: form.driverId,
        cargoWeightKg: Number(form.cargoWeightKg),
        plannedDistanceKm: Number(form.plannedDistanceKm),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Failed to create trip", "error");
      return;
    }
    setCreateOpen(false);
    setForm({ source: "", destination: "", vehicleId: "", driverId: "", cargoWeightKg: "", plannedDistanceKm: "" });
    showToast(`Trip ${data.trip.tripCode} created as DRAFT`);
    load();
  }

  async function dispatch(id: string) {
    const res = await fetch(`/api/trips/${id}/dispatch`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Failed to dispatch", "error");
      return;
    }
    showToast(`Trip ${data.trip.tripCode} dispatched`);
    load();
  }

  async function cancel(id: string, reason?: string) {
    const res = await fetch(`/api/trips/${id}/cancel`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason ?? "" }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Failed to cancel", "error");
      return;
    }
    showToast(`Trip ${data.trip.tripCode} cancelled`);
    load();
  }

  function openCancel(t: Trip) {
    setCancelReason("");
    setCancelTarget(t);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    await cancel(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setCancelReason("");
  }

  async function complete(id: string) {
    const res = await fetch(`/api/trips/${id}/complete`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        finalOdometerKm: Number(completeForm.finalOdometerKm),
        fuelConsumedL: Number(completeForm.fuelConsumedL),
        fuelCost: completeForm.fuelCost ? Number(completeForm.fuelCost) : 0,
        revenue: completeForm.revenue ? Number(completeForm.revenue) : 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Failed to complete", "error");
      return;
    }
    setCompleteTrip(null);
    setCompleteForm({ finalOdometerKm: "", fuelConsumedL: "", fuelCost: "", revenue: "" });
    showToast(`Trip ${data.trip.tripCode} completed`);
    load();
  }

  const availableVehicles = vehicles.filter((v) => v.status === "AVAILABLE");
  const eligibleDrivers = drivers.filter(
    (d) => d.status !== "SUSPENDED" && new Date(d.licenseExpiryDate) >= new Date()
  );

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Trip Management</h1>
          <p className="mt-2 text-lg text-zinc-600">Dispatch and track all fleet operations</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className={buttonPrimaryClass}>
          + Create Trip
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <h2 className="text-sm font-medium text-zinc-500">Total Trips</h2>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{trips.length}</p>
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-zinc-500">Dispatched</h2>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{trips.filter(t => t.status === "DISPATCHED").length}</p>
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-zinc-500">Completed</h2>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{trips.filter(t => t.status === "COMPLETED").length}</p>
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-zinc-500">Revenue</h2>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{formatCurrency(trips.reduce((a, t) => a + (t.revenue ?? 0), 0))}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">All Trips</h2>
        {loading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  {[
                    ["tripCode", "Code"],
                    ["source", "Route"],
                    ["vehicle", "Vehicle"],
                    ["driver", "Driver"],
                    ["cargoWeightKg", "Cargo (kg)"],
                    ["plannedDistanceKm", "Distance (km)"],
                    ["status", "Status"],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => toggleSort(key as string)}
                      className="cursor-pointer select-none py-2 pr-4 hover:text-zinc-900"
                    >
                      {label}
                      {sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    </th>
                  ))}
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageTrips.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-4 font-medium text-zinc-900">{t.tripCode}</td>
                    <td className="py-2 pr-4 text-zinc-600">
                      {t.source} → {t.destination}
                    </td>
                    <td className="py-2 pr-4 text-zinc-600">
                      {t.vehicle?.registrationNumber ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-zinc-600">{t.driver?.name ?? "—"}</td>
                    <td className="py-2 pr-4 text-zinc-600">{t.cargoWeightKg}</td>
                    <td className="py-2 pr-4 text-zinc-600">{t.plannedDistanceKm}</td>
                    <td className="py-2 pr-4">
                      <TripTimeline status={t.status} />
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        {t.status === "DRAFT" && (
                          <>
                            <button
                              onClick={() => dispatch(t.id)}
                              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              Dispatch
                            </button>
                            <button
                              onClick={() => openCancel(t)}
                              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {t.status === "DISPATCHED" && (
                          <>
                            <button
                              onClick={() => setCompleteTrip(t)}
                              className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => openCancel(t)}
                              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {t.status === "COMPLETED" && (
                          <span className="text-xs text-zinc-500">Done</span>
                        )}
                        {t.status === "CANCELLED" && (
                          <span
                            className="text-xs text-rose-500"
                            title={t.cancelReason ?? ""}
                          >
                            {t.cancelReason ? `Cancelled: ${t.cancelReason}` : "Cancelled"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {trips.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-zinc-500">
                      No trips yet. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {sortedTrips.length > pageSize && (
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
              <span>
                Page {page} of {totalPages} · {sortedTrips.length} trips
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Trip">
        <FormField label="Source">
          <input className={inputClass} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Central Depot" />
        </FormField>
        <FormField label="Destination">
          <input className={inputClass} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="e.g. East Yard" />
        </FormField>
        <FormField label="Vehicle (Available only)">
          <div className="flex gap-2">
            <select className={inputClass} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
              <option value="">Select vehicle</option>
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} — {v.nameModel}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={suggest}
              className="whitespace-nowrap rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              ✨ Smart Suggest
            </button>
          </div>
        </FormField>
        <FormField label="Driver (Eligible only)">
          <select className={inputClass} value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
            <option value="">Select driver</option>
            {eligibleDrivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Cargo Weight (kg)">
          <input type="number" className={inputClass} value={form.cargoWeightKg} onChange={(e) => setForm({ ...form, cargoWeightKg: e.target.value })} />
        </FormField>
        <FormField label="Planned Distance (km)">
          <input type="number" className={inputClass} value={form.plannedDistanceKm} onChange={(e) => setForm({ ...form, plannedDistanceKm: e.target.value })} />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setCreateOpen(false)} className={buttonSecondaryClass}>
            Cancel
          </button>
          <button onClick={createTrip} className={buttonPrimaryClass}>
            Create
          </button>
        </div>
      </Modal>

      <Modal
        open={!!completeTrip}
        onClose={() => setCompleteTrip(null)}
        title={`Complete Trip ${completeTrip?.tripCode ?? ""}`}
      >
        <FormField label="Final Odometer (km)">
          <input type="number" className={inputClass} value={completeForm.finalOdometerKm} onChange={(e) => setCompleteForm({ ...completeForm, finalOdometerKm: e.target.value })} />
        </FormField>
        <FormField label="Fuel Consumed (L)">
          <input type="number" className={inputClass} value={completeForm.fuelConsumedL} onChange={(e) => setCompleteForm({ ...completeForm, fuelConsumedL: e.target.value })} />
        </FormField>
        <FormField label="Fuel Cost">
          <input type="number" className={inputClass} value={completeForm.fuelCost} onChange={(e) => setCompleteForm({ ...completeForm, fuelCost: e.target.value })} />
        </FormField>
        <FormField label="Revenue">
          <input type="number" className={inputClass} value={completeForm.revenue} onChange={(e) => setCompleteForm({ ...completeForm, revenue: e.target.value })} />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setCompleteTrip(null)} className={buttonSecondaryClass}>
            Cancel
          </button>
          <button onClick={() => completeTrip && complete(completeTrip.id)} className={buttonPrimaryClass}>
            Complete
          </button>
        </div>
      </Modal>

      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={`Cancel Trip ${cancelTarget?.tripCode ?? ""}`}
      >
        <FormField label="Reason (optional)">
          <textarea
            className={inputClass}
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. vehicle breakdown, no driver available"
          />
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setCancelTarget(null)} className={buttonSecondaryClass}>
            Close
          </button>
          <button onClick={confirmCancel} className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
            Confirm Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
