"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Thead, EmptyRow, LoadingRow } from "@/components/Table";
import { StatusBadge } from "@/components/Badge";
import { formatCurrency } from "@/lib/format";
import { Modal } from "@/components/Modal";
import { FormField, inputClass, buttonPrimaryClass, buttonSecondaryClass } from "@/components/FormField";
import { FleetMap } from "@/components/MapView";

type Vehicle = {
  id: string;
  registrationNumber: string;
  nameModel: string;
  type: string;
  maxLoadCapacityKg: number;
  odometerKm: number;
  acquisitionCost: number;
  region: string | null;
  status: string;
};

const VEHICLE_TYPES = ["VAN", "TRUCK", "MINI", "OTHER"];
const VEHICLE_STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];

const emptyForm = {
  registrationNumber: "",
  nameModel: "",
  type: "VAN",
  maxLoadCapacityKg: "",
  odometerKm: "",
  acquisitionCost: "",
  region: "",
  status: "AVAILABLE",
};

export default function FleetPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>("registrationNumber");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [showMap, setShowMap] = useState(true);
  const pageSize = 8;

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (typeFilter) p.set("type", typeFilter);
    if (statusFilter) p.set("status", statusFilter);
    return p.toString();
  }, [search, typeFilter, statusFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ["vehicles", params],
    queryFn: async () => {
      const res = await fetch(`/api/vehicles?${params}`);
      if (!res.ok) throw new Error("Failed to load vehicles");
      return res.json() as Promise<{ vehicles: Vehicle[] }>;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        registrationNumber: form.registrationNumber,
        nameModel: form.nameModel,
        type: form.type,
        maxLoadCapacityKg: Number(form.maxLoadCapacityKg),
        odometerKm: Number(form.odometerKm || 0),
        acquisitionCost: Number(form.acquisitionCost),
        region: form.region || undefined,
        status: form.status,
      };
      const res = await fetch(editing ? `/api/vehicles/${editing.id}` : "/api/vehicles", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save vehicle");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      closeModal();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete vehicle");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(v: Vehicle) {
    setEditing(v);
    setForm({
      registrationNumber: v.registrationNumber,
      nameModel: v.nameModel,
      type: v.type,
      maxLoadCapacityKg: String(v.maxLoadCapacityKg),
      odometerKm: String(v.odometerKm),
      acquisitionCost: String(v.acquisitionCost),
      region: v.region ?? "",
      status: v.status,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setFormError(null);
  }

  const vehicles = data?.vehicles ?? [];

  const sortedVehicles = useMemo(() => {
    const arr = [...vehicles];
    arr.sort((a, b) => {
      let av: any = (a as any)[sortKey];
      let bv: any = (b as any)[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      av = av ?? 0;
      bv = bv ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [vehicles, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedVehicles.length / pageSize));
  const pageVehicles = sortedVehicles.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Vehicle Registry</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Registration No. must be unique. Retired/In Shop vehicles are hidden from Trip Dispatcher.
          </p>
        </div>
        <button onClick={openAdd} className={buttonPrimaryClass}>
          + Add Vehicle
        </button>
      </div>

      <div className="mb-4">
        <button
          onClick={() => setShowMap((s) => !s)}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          {showMap ? "Hide Map" : "Show Live Map"}
        </button>
      </div>

      {showMap && <FleetMap refreshInterval={5000} />}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reg. no or model…"
          className={`${inputClass} max-w-xs`}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputClass}>
          <option value="">All Types</option>
          {VEHICLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="">All Statuses</option>
          {VEHICLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <Table>
        <Thead
          columns={["Reg. No.", "Name/Model", "Type", "Capacity", "Odometer", "Acq. Cost", "Status", ""]}
          sort={{
            keys: {
              "Reg. No.": "registrationNumber",
              "Name/Model": "nameModel",
              Type: "type",
              Capacity: "maxLoadCapacityKg",
              Odometer: "odometerKm",
              "Acq. Cost": "acquisitionCost",
              Status: "status",
            },
            active: sortKey,
            dir: sortDir,
            onSort: toggleSort,
          }}
        />
        <tbody className="divide-y divide-zinc-100">
          {isLoading && <LoadingRow colSpan={8} />}
          {!isLoading && sortedVehicles.length === 0 && (
            <EmptyRow colSpan={8} message="No vehicles found." />
          )}
          {pageVehicles.map((v) => (
            <tr key={v.id}>
              <td className="px-4 py-3 font-medium text-zinc-900">
                <Link href={`/fleet/${v.id}`} className="hover:text-blue-600 hover:underline">
                  {v.registrationNumber}
                </Link>
              </td>
              <td className="px-4 py-3">{v.nameModel}</td>
              <td className="px-4 py-3">{v.type}</td>
              <td className="px-4 py-3">{v.maxLoadCapacityKg} kg</td>
              <td className="px-4 py-3">{v.odometerKm.toLocaleString()} km</td>
              <td className="px-4 py-3">{formatCurrency(v.acquisitionCost)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={v.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => openEdit(v)}
                  className="mr-3 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete vehicle ${v.registrationNumber}?`)) {
                      deleteMutation.mutate(v.id);
                    }
                  }}
                  className="text-xs font-medium text-rose-600 hover:text-rose-800"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {sortedVehicles.length > pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>
            Page {page} of {totalPages} · {sortedVehicles.length} vehicles
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

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Edit Vehicle" : "Add Vehicle"}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <FormField label="Registration Number">
            <input
              required
              value={form.registrationNumber}
              onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
              className={inputClass}
            />
          </FormField>
          <FormField label="Name / Model">
            <input
              required
              value={form.nameModel}
              onChange={(e) => setForm({ ...form, nameModel: e.target.value })}
              className={inputClass}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={inputClass}
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inputClass}
              >
                {VEHICLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Max Load Capacity (kg)">
              <input
                required
                type="number"
                min={0}
                value={form.maxLoadCapacityKg}
                onChange={(e) => setForm({ ...form, maxLoadCapacityKg: e.target.value })}
                className={inputClass}
              />
            </FormField>
            <FormField label="Odometer (km)">
              <input
                type="number"
                min={0}
                value={form.odometerKm}
                onChange={(e) => setForm({ ...form, odometerKm: e.target.value })}
                className={inputClass}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Acquisition Cost">
              <input
                required
                type="number"
                min={0}
                value={form.acquisitionCost}
                onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })}
                className={inputClass}
              />
            </FormField>
            <FormField label="Region">
              <input
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className={inputClass}
              />
            </FormField>
          </div>

          {formError && <p className="mb-4 text-sm text-rose-600">{formError}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={closeModal} className={buttonSecondaryClass}>
              Cancel
            </button>
            <button type="submit" disabled={saveMutation.isPending} className={buttonPrimaryClass}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
