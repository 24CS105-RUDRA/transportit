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
type Trip = { id: string; tripCode: string };
type FuelLog = {
  id: string;
  liters: number;
  cost: number;
  date: string;
  vehicle?: Vehicle | null;
  trip?: Trip | null;
};
type Expense = {
  id: string;
  toll: number;
  otherMisc: number;
  total: number;
  status: string;
  vehicle?: Vehicle | null;
  trip?: Trip | null;
};

export default function FuelExpensesPage() {
  const [tab, setTab] = useState<"fuel" | "expenses">("fuel");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast, clearToast } = useToast();

  const [fuelOpen, setFuelOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const [fuelForm, setFuelForm] = useState({
    vehicleId: "",
    tripId: "",
    date: new Date().toISOString().slice(0, 10),
    liters: "",
    cost: "",
  });
  const [expenseForm, setExpenseForm] = useState({
    vehicleId: "",
    tripId: "",
    toll: "",
    otherMisc: "",
    status: "PENDING",
  });

  const load = useCallback(async () => {
    try {
      const [v, t, f, e] = await Promise.all([
        fetch("/api/vehicles", { credentials: "include" }),
        fetch("/api/trips", { credentials: "include" }),
        fetch("/api/fuel-logs", { credentials: "include" }),
        fetch("/api/expenses", { credentials: "include" }),
      ]);
      if (v.status === 401) {
        window.location.href = "/login";
        return;
      }
      const [vd, td, fd, ed] = await Promise.all([v.json(), t.json(), f.json(), e.json()]);
      setVehicles(vd.vehicles);
      setTrips(td.trips);
      setFuelLogs(fd.logs);
      setExpenses(ed.expenses);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function createFuel() {
    setError(null);
    const res = await fetch("/api/fuel-logs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId: fuelForm.vehicleId,
        tripId: fuelForm.tripId || undefined,
        date: fuelForm.date,
        liters: Number(fuelForm.liters),
        cost: Number(fuelForm.cost),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Failed to create fuel log", "error");
      return;
    }
    setFuelOpen(false);
    setFuelForm({ vehicleId: "", tripId: "", date: new Date().toISOString().slice(0, 10), liters: "", cost: "" });
    showToast("Fuel log created");
    load();
  }

  async function createExpense() {
    setError(null);
    const res = await fetch("/api/expenses", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId: expenseForm.vehicleId,
        tripId: expenseForm.tripId || undefined,
        toll: Number(expenseForm.toll),
        otherMisc: Number(expenseForm.otherMisc),
        status: expenseForm.status,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error ?? "Failed to create expense", "error");
      return;
    }
    setExpenseOpen(false);
    setExpenseForm({ vehicleId: "", tripId: "", toll: "", otherMisc: "", status: "PENDING" });
    showToast("Expense created");
    load();
  }

  const totalFuelCost = fuelLogs.reduce((a, l) => a + l.cost, 0);
  const totalExpenseCost = expenses.reduce((a, e) => a + e.total, 0);

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Fuel & Expenses</h1>
          <p className="mt-2 text-lg text-zinc-600">Track and analyze fuel consumption and costs</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("fuel")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "fuel" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700"
            }`}
          >
            Fuel Logs
          </button>
          <button
            onClick={() => setTab("expenses")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "expenses" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700"
            }`}
          >
            Expenses
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : tab === "fuel" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <h2 className="text-sm font-medium text-zinc-500">Total Fuel (L)</h2>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {fuelLogs.reduce((a, l) => a + l.liters, 0).toLocaleString()}
              </p>
            </Card>
            <Card>
              <h2 className="text-sm font-medium text-zinc-500">Total Fuel Cost</h2>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {formatCurrency(totalFuelCost)}
              </p>
            </Card>
            <div className="flex items-end">
              <button onClick={() => setFuelOpen(true)} className={buttonPrimaryClass}>
                + Add Fuel Log
              </button>
            </div>
          </div>

          <Card>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900">Fuel Logs</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-2 pr-4">Vehicle</th>
                    <th className="py-2 pr-4">Trip</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Liters</th>
                    <th className="py-2 pr-4">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelLogs.map((l) => (
                    <tr key={l.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-4 font-medium text-zinc-900">
                        {l.vehicle?.registrationNumber ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600">{l.trip?.tripCode ?? "—"}</td>
                      <td className="py-2 pr-4 text-zinc-600">
                        {new Date(l.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600">{l.liters}</td>
                      <td className="py-2 pr-4 text-zinc-600">{formatCurrency(l.cost)}</td>
                    </tr>
                  ))}
                  {fuelLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-zinc-500">
                        No fuel logs yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <h2 className="text-sm font-medium text-zinc-500">Total Expenses</h2>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {formatCurrency(totalExpenseCost)}
              </p>
            </Card>
            <Card>
              <h2 className="text-sm font-medium text-zinc-500">Pending</h2>
              <p className="mt-1 text-2xl font-semibold text-orange-600">
                {expenses.filter((e) => e.status === "PENDING").length}
              </p>
            </Card>
            <div className="flex items-end">
              <button onClick={() => setExpenseOpen(true)} className={buttonPrimaryClass}>
                + Add Expense
              </button>
            </div>
          </div>

          <Card>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900">Expenses</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-2 pr-4">Vehicle</th>
                    <th className="py-2 pr-4">Trip</th>
                    <th className="py-2 pr-4">Toll</th>
                    <th className="py-2 pr-4">Other</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-4 font-medium text-zinc-900">
                        {e.vehicle?.registrationNumber ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600">{e.trip?.tripCode ?? "—"}</td>
                      <td className="py-2 pr-4 text-zinc-600">{formatCurrency(e.toll)}</td>
                      <td className="py-2 pr-4 text-zinc-600">{formatCurrency(e.otherMisc)}</td>
                      <td className="py-2 pr-4 text-zinc-600">{formatCurrency(e.total)}</td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={e.status} />
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-zinc-500">
                        No expenses yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Modal open={fuelOpen} onClose={() => setFuelOpen(false)} title="Add Fuel Log">
        <FormField label="Vehicle">
          <select className={inputClass} value={fuelForm.vehicleId} onChange={(e) => setFuelForm({ ...fuelForm, vehicleId: e.target.value })}>
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registrationNumber} — {v.nameModel}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Trip (optional)">
          <select className={inputClass} value={fuelForm.tripId} onChange={(e) => setFuelForm({ ...fuelForm, tripId: e.target.value })}>
            <option value="">None</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.tripCode}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Date">
          <input type="date" className={inputClass} value={fuelForm.date} onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })} />
        </FormField>
        <FormField label="Liters">
          <input type="number" className={inputClass} value={fuelForm.liters} onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} />
        </FormField>
        <FormField label="Cost">
          <input type="number" className={inputClass} value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} />
        </FormField>
        {fuelForm.liters && fuelForm.cost && Number(fuelForm.liters) > 0 && (
          <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 mb-4">
            Total: {formatCurrency(Number(fuelForm.cost))} · Cost/L: {formatCurrency(Number(fuelForm.cost) / Number(fuelForm.liters))}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setFuelOpen(false)} className={buttonSecondaryClass}>
            Cancel
          </button>
          <button onClick={createFuel} className={buttonPrimaryClass}>
            Create
          </button>
        </div>
      </Modal>

      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)} title="Add Expense">
        <FormField label="Vehicle">
          <select className={inputClass} value={expenseForm.vehicleId} onChange={(e) => setExpenseForm({ ...expenseForm, vehicleId: e.target.value })}>
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registrationNumber} — {v.nameModel}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Trip (optional)">
          <select className={inputClass} value={expenseForm.tripId} onChange={(e) => setExpenseForm({ ...expenseForm, tripId: e.target.value })}>
            <option value="">None</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.tripCode}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Toll">
          <input type="number" className={inputClass} value={expenseForm.toll} onChange={(e) => setExpenseForm({ ...expenseForm, toll: e.target.value })} />
        </FormField>
        <FormField label="Other / Misc">
          <input type="number" className={inputClass} value={expenseForm.otherMisc} onChange={(e) => setExpenseForm({ ...expenseForm, otherMisc: e.target.value })} />
        </FormField>
        {expenseForm.toll && expenseForm.otherMisc && (
          <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 mb-4">
            Total: {formatCurrency(Number(expenseForm.toll || 0) + Number(expenseForm.otherMisc || 0))}
          </div>
        )}
        <FormField label="Status">
          <select className={inputClass} value={expenseForm.status} onChange={(e) => setExpenseForm({ ...expenseForm, status: e.target.value })}>
            <option value="PENDING">PENDING</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setExpenseOpen(false)} className={buttonSecondaryClass}>
            Cancel
          </button>
          <button onClick={createExpense} className={buttonPrimaryClass}>
            Create
          </button>
        </div>
      </Modal>
    </div>
  );
}
