"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";
import { FormField, inputClass, buttonPrimaryClass, buttonSecondaryClass } from "@/components/FormField";
import { StatusBadge } from "@/components/Badge";

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
  vehicle?: Vehicle | null;
  driver?: Driver | null;
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [completeTrip, setCompleteTrip] = useState<Trip | null>(null);

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  async function createTrip() {
    setError(null);
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
      setError(data.error ?? "Failed to create trip");
      return;
    }
    setCreateOpen(false);
    setForm({ source: "", destination: "", vehicleId: "", driverId: "", cargoWeightKg: "", plannedDistanceKm: "" });
    showToast(`Trip ${data.trip.tripCode} created as DRAFT`);
    load();
  }

  async function dispatch(id: string) {
    setError(null);
    const res = await fetch(`/api/trips/${id}/dispatch`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to dispatch");
      return;
    }
    showToast(`Trip ${data.trip.tripCode} dispatched`);
    load();
  }

  async function cancel(id: string) {
    setError(null);
    const res = await fetch(`/api/trips/${id}/cancel`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to cancel");
      return;
    }
    showToast(`Trip ${data.trip.tripCode} cancelled`);
    load();
  }

  async function complete(id: string) {
    setError(null);
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
      setError(data.error ?? "Failed to complete");
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
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

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

      <Card>
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">All Trips</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Route</th>
                  <th className="py-2 pr-4">Vehicle</th>
                  <th className="py-2 pr-4">Driver</th>
                  <th className="py-2 pr-4">Cargo (kg)</th>
                  <th className="py-2 pr-4">Distance (km)</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
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
                      <StatusBadge status={t.status} />
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
                              onClick={() => cancel(t.id)}
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
                              onClick={() => cancel(t.id)}
                              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {t.status === "COMPLETED" && (
                          <span className="text-xs text-zinc-400">Done</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {trips.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-zinc-400">
                      No trips yet. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
          <select className={inputClass} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
            <option value="">Select vehicle</option>
            {availableVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registrationNumber} — {v.nameModel}
              </option>
            ))}
          </select>
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
    </div>
  );
}
