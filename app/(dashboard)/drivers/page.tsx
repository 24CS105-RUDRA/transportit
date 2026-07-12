"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isBefore } from "date-fns";
import { Table, Thead, EmptyRow, LoadingRow } from "@/components/Table";
import { StatusBadge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { FormField, inputClass, buttonPrimaryClass, buttonSecondaryClass } from "@/components/FormField";

type Driver = {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  safetyScore: number;
  status: string;
};

const LICENSE_CATEGORIES = ["LMV", "HMV", "OTHER"];
const DRIVER_STATUSES = ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED"];

const emptyForm = {
  name: "",
  licenseNumber: "",
  licenseCategory: "LMV",
  licenseExpiryDate: "",
  contactNumber: "",
  safetyScore: "100",
  status: "AVAILABLE",
};

export default function DriversPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (statusFilter) p.set("status", statusFilter);
    return p.toString();
  }, [search, statusFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ["drivers", params],
    queryFn: async () => {
      const res = await fetch(`/api/drivers?${params}`);
      if (!res.ok) throw new Error("Failed to load drivers");
      return res.json() as Promise<{ drivers: Driver[] }>;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        licenseNumber: form.licenseNumber,
        licenseCategory: form.licenseCategory,
        licenseExpiryDate: form.licenseExpiryDate,
        contactNumber: form.contactNumber,
        safetyScore: Number(form.safetyScore),
        status: form.status,
      };
      const res = await fetch(editing ? `/api/drivers/${editing.id}` : "/api/drivers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save driver");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      closeModal();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/drivers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete driver");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "SUSPEND" | "ACTIVATE" }) => {
      const newStatus = action === "SUSPEND" ? "SUSPENDED" : "AVAILABLE";
      const res = await fetch(`/api/drivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update driver");
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });

  function safetyScoreColor(score: number) {
    if (score >= 80) return "text-emerald-600 bg-emerald-50";
    if (score >= 50) return "text-amber-600 bg-amber-50";
    return "text-rose-600 bg-rose-50";
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(d: Driver) {
    setEditing(d);
    setForm({
      name: d.name,
      licenseNumber: d.licenseNumber,
      licenseCategory: d.licenseCategory,
      licenseExpiryDate: d.licenseExpiryDate.slice(0, 10),
      contactNumber: d.contactNumber,
      safetyScore: String(d.safetyScore),
      status: d.status,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setFormError(null);
  }

  const drivers = data?.drivers ?? [];

  const sortedDrivers = useMemo(() => {
    const arr = [...drivers];
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
  }, [drivers, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedDrivers.length / pageSize));
  const pageDrivers = sortedDrivers.slice((page - 1) * pageSize, page * pageSize);

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
          <h1 className="text-2xl font-semibold text-zinc-900">Drivers & Safety Profiles</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Expired license or Suspended status blocks trip assignment.
          </p>
        </div>
        <button onClick={openAdd} className={buttonPrimaryClass}>
          + Add Driver
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or license no…"
          className={`${inputClass} max-w-xs`}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="">All Statuses</option>
          {DRIVER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <Table>
        <Thead
          columns={["Driver", "License No.", "Category", "Expiry", "Contact", "Safety Score", "Status", ""]}
          sort={{
            keys: {
              Driver: "name",
              "License No.": "licenseNumber",
              Category: "licenseCategory",
              Expiry: "licenseExpiryDate",
              "Safety Score": "safetyScore",
              Status: "status",
            },
            active: sortKey,
            dir: sortDir,
            onSort: toggleSort,
          }}
        />
        <tbody className="divide-y divide-zinc-100">
          {isLoading && <LoadingRow colSpan={8} />}
          {!isLoading && sortedDrivers.length === 0 && (
            <EmptyRow colSpan={8} message="No drivers found." />
          )}
          {pageDrivers.map((d) => {
            const expired = isBefore(new Date(d.licenseExpiryDate), new Date());
            return (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium text-zinc-900">{d.name}</td>
                <td className="px-4 py-3">{d.licenseNumber}</td>
                <td className="px-4 py-3">{d.licenseCategory}</td>
                <td className={`px-4 py-3 ${expired ? "font-medium text-rose-600" : ""}`}>
                  {format(new Date(d.licenseExpiryDate), "MMM d, yyyy")}
                  {expired && " (expired)"}
                </td>
                <td className="px-4 py-3">{d.contactNumber}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${safetyScoreColor(d.safetyScore)}`}>
                    {d.safetyScore}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={d.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {d.status !== "SUSPENDED" ? (
                    <button
                      onClick={() => suspendMutation.mutate({ id: d.id, action: "SUSPEND" })}
                      className="mr-2 rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => suspendMutation.mutate({ id: d.id, action: "ACTIVATE" })}
                      className="mr-2 rounded border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(d)}
                    className="mr-3 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete driver ${d.name}?`)) {
                        deleteMutation.mutate(d.id);
                      }
                    }}
                    className="text-xs font-medium text-rose-600 hover:text-rose-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {sortedDrivers.length > pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>
            Page {page} of {totalPages} · {sortedDrivers.length} drivers
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

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Edit Driver" : "Add Driver"}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <FormField label="Name">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </FormField>
          <FormField label="License Number">
            <input
              required
              value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              className={inputClass}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="License Category">
              <select
                value={form.licenseCategory}
                onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })}
                className={inputClass}
              >
                {LICENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="License Expiry">
              <input
                required
                type="date"
                value={form.licenseExpiryDate}
                onChange={(e) => setForm({ ...form, licenseExpiryDate: e.target.value })}
                className={inputClass}
              />
            </FormField>
          </div>
          <FormField label="Contact Number">
            <input
              required
              value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
              className={inputClass}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Safety Score (0-100)">
              <input
                type="number"
                min={0}
                max={100}
                value={form.safetyScore}
                onChange={(e) => setForm({ ...form, safetyScore: e.target.value })}
                className={inputClass}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inputClass}
              >
                {DRIVER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
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
