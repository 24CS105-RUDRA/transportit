"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/Badge";
import { formatCurrency } from "@/lib/format";
import { TableSkeleton } from "@/components/Skeleton";
import { VehicleTrackMap } from "@/components/MapView";

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

type Trip = {
  id: string;
  tripCode: string;
  source: string;
  destination: string;
  status: string;
  revenue: number | null;
  driver?: { name: string } | null;
};

type VehicleDocument = {
  id: string;
  name: string;
  type: string;
  url: string | null;
  uploadedBy: string | null;
  createdAt: string;
};

function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [docForm, setDocForm] = useState({ name: "", type: "Insurance", url: "" });

  const fetchDocs = useCallback(() => {
    if (!id) return;
    fetch(`/api/vehicles/${id}/documents`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) { window.location.href = "/login"; return null; }
        return res.json();
      })
      .then((d) => d && setDocuments(d.documents ?? []))
      .catch(() => {});
  }, [id]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function addDocument() {
    if (!docForm.name.trim()) return;
    await fetch(`/api/vehicles/${id}/documents`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: docForm.name.trim(), type: docForm.type, url: docForm.url || undefined }),
    });
    setDocForm({ name: "", type: "Insurance", url: "" });
    fetchDocs();
  }

  useEffect(() => {
    fetch(`/api/vehicles/${id}/detail`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return res.json();
      })
      .then((d) => {
        if (d && d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <TableSkeleton rows={6} cols={5} />;
  if (error) return <p className="text-sm text-rose-600">Error: {error}</p>;
  if (!data) return null;

  const v: Vehicle = data.vehicle;
  const s = data.stats;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/fleet")}
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← Back to Fleet
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            {v.registrationNumber}
          </h1>
          <p className="mt-1 text-zinc-600">
            {v.nameModel} · {v.type}
            {v.region ? ` · ${v.region}` : ""}
          </p>
        </div>
        <StatusBadge status={v.status} />
      </div>

      {v.status !== "RETIRED" && (
        <VehicleTrackMap vehicleId={v.id} refreshInterval={5000} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-zinc-500">ROI</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {(s.roi * 100).toFixed(1)}%
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Total Revenue</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900">
            {formatCurrency(s.totalRevenue)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Fuel + Maintenance</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900">
            {formatCurrency(s.totalFuelCost + s.totalMaintenance)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Trips</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900">
            {s.completedTripCount}/{s.tripCount}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">Trip History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Route</th>
                <th className="py-2 pr-4">Driver</th>
                <th className="py-2 pr-4">Revenue</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.trips.map((t: Trip) => (
                <tr key={t.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-4 font-medium text-zinc-900">{t.tripCode}</td>
                  <td className="py-2 pr-4 text-zinc-600">
                    {t.source} → {t.destination}
                  </td>
                  <td className="py-2 pr-4 text-zinc-600">{t.driver?.name ?? "—"}</td>
                  <td className="py-2 pr-4 text-zinc-600">
                    {t.revenue != null ? formatCurrency(t.revenue) : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
              {data.trips.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-zinc-500">
                    No trips recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">Documents</h2>
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={docForm.type}
            onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {["Insurance", "Registration", "RC Book", "Tax", "Pollution", "Permit", "Other"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input
            value={docForm.name}
            onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
            placeholder="Document name"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            value={docForm.url}
            onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
            placeholder="URL (optional)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button onClick={addDocument} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Add
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">URL</th>
                <th className="py-2 pr-4">Added by</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-4 text-zinc-600">{d.type}</td>
                  <td className="py-2 pr-4 font-medium text-zinc-900">{d.name}</td>
                  <td className="py-2 pr-4 text-zinc-600">
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Link
                      </a>
                    ) : "—"}
                  </td>
                  <td className="py-2 pr-4 text-zinc-600">{d.uploadedBy ?? "—"}</td>
                  <td className="py-2 pr-4 text-zinc-600">{new Date(d.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-zinc-500">No documents yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default DetailPage;
