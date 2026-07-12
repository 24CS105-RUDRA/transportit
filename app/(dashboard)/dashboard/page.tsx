"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, KpiCard } from "@/components/Card";
import { KpiSkeletonGrid } from "@/components/Skeleton";
import { StatusBadge } from "@/components/Badge";
import { inputClass } from "@/components/FormField";

type Trip = {
  id: string;
  tripCode: string;
  source: string;
  destination: string;
  status: string;
  cargoWeightKg: number;
  vehicle?: { registrationNumber: string } | null;
  driver?: { name: string } | null;
};

type Stats = {
  filters?: { type: string | null; status: string | null; region: string | null };
  vehicles: {
    total: number;
    available: number;
    onTrip: number;
    inShop: number;
    retired: number;
  };
  drivers: {
    total: number;
    available: number;
    onTrip: number;
    offDuty: number;
    suspended: number;
  };
  trips: {
    total: number;
    draft: number;
    dispatched: number;
    completed: number;
    cancelled: number;
  };
  fleetUtilization: number;
  maintenanceActive: number;
  expiringLicenses: number;
};

const VEHICLE_TYPES = ["VAN", "TRUCK", "MINI", "OTHER"];
const VEHICLE_STATUSES = ["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"];

function ProgressBar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>{value}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<Stats | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [filters, setFilters] = useState({ type: "", status: "", region: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);

  useEffect(() => {
    setFilters({
      type: searchParams.get("type") ?? "",
      status: searchParams.get("status") ?? "",
      region: searchParams.get("region") ?? "",
    });
  }, [searchParams]);

  function updateFilters(next: { type: string; status: string; region: string }) {
    const params = new URLSearchParams();
    if (next.type) params.set("type", next.type);
    if (next.status) params.set("status", next.status);
    if (next.region) params.set("region", next.region);
    const qs = params.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
  }

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.status) params.set("status", filters.status);
    if (filters.region) params.set("region", filters.region);
    const qs = params.toString();
    fetch(`/api/dashboard/stats${qs ? `?${qs}` : ""}`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then((data) => {
        if (data) setStats(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/vehicles", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const rs = Array.from(
          new Set((d.vehicles ?? []).map((v: { region: string | null }) => v.region).filter(Boolean))
        ) as string[];
        setRegions(rs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/trips?status=DISPATCHED", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRecentTrips((d.trips ?? []).slice(0, 5)))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">TransitOps Dashboard</h1>
        <p className="mt-2 text-lg text-zinc-600">
          Smart Transport Operations Platform - Fleet Management System
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Vehicle Type</label>
            <select
              className={inputClass}
              value={filters.type}
              onChange={(e) => updateFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All</option>
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Status</label>
            <select
              className={inputClass}
              value={filters.status}
              onChange={(e) => updateFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All</option>
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Region</label>
            <select
              className={inputClass}
              value={filters.region}
              onChange={(e) => updateFilters({ ...filters, region: e.target.value })}
            >
              <option value="">All</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => updateFilters({ type: "", status: "", region: "" })}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Clear Filters
          </button>
          {(filters.type || filters.status || filters.region) && (
            <span className="text-xs text-zinc-500">
              Filtered by{" "}
              {[filters.type, filters.status && `status: ${filters.status}`, filters.region && `region: ${filters.region}`]
                .filter(Boolean)
                .join(", ")}
            </span>
          )}
        </div>
      </Card>

      {loading && <KpiSkeletonGrid count={8} />}
      {error && (
        <p className="text-sm text-rose-600">Error: {error}</p>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="animate-slideUp delay-1"><KpiCard
              label="Total Vehicles"
              value={stats.vehicles.total}
              sub={`${stats.vehicles.available} Available, ${stats.vehicles.onTrip} On Trip`}
              href="/fleet"
            /></div>
            <div className="animate-slideUp delay-2"><KpiCard
              label="Active Drivers"
              value={stats.drivers.total}
              sub={`${stats.drivers.available} Available, ${stats.drivers.onTrip} On Trip`}
              href="/drivers"
            /></div>
            <div className="animate-slideUp delay-3"><KpiCard
              label="Trips (Total)"
              value={stats.trips.total}
              sub={`${stats.trips.dispatched} Dispatched, ${stats.trips.completed} Completed`}
              href="/trips"
            /></div>
            <div className="animate-slideUp delay-4"><KpiCard
              label="Fleet Utilization"
              value={`${stats.fleetUtilization}%`}
              sub={`${stats.vehicles.onTrip} of ${stats.vehicles.total - stats.vehicles.retired} active`}
              href="/maintenance"
            /></div>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-zinc-900">Recent Trips</h2>
              <Link href="/trips" className="text-sm font-medium text-blue-600 hover:underline">
                View all →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-2 pr-4">Trip Code</th>
                    <th className="py-2 pr-4">Route</th>
                    <th className="py-2 pr-4">Vehicle</th>
                    <th className="py-2 pr-4">Driver</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrips.map((t) => (
                    <tr key={t.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-4 font-medium text-zinc-900">{t.tripCode}</td>
                      <td className="py-2 pr-4 text-zinc-600">{t.source} → {t.destination}</td>
                      <td className="py-2 pr-4 text-zinc-600">{t.vehicle?.registrationNumber ?? "—"}</td>
                      <td className="py-2 pr-4 text-zinc-600">{t.driver?.name ?? "—"}</td>
                      <td className="py-2 pr-4"><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                  {recentTrips.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-zinc-500">
                        No active trips. Create one in the dispatcher.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-semibold text-zinc-900 mb-4">
                Fleet Health
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-1">Vehicle Availability</p>
                  <ProgressBar value={stats.vehicles.available} max={stats.vehicles.total} color="bg-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-1">Driver Availability</p>
                  <ProgressBar value={stats.drivers.available} max={stats.drivers.total} color="bg-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-1">Fleet Utilization</p>
                  <ProgressBar value={stats.fleetUtilization} max={100} color="bg-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-1">Trip Completion Rate</p>
                  <ProgressBar
                    value={stats.trips.completed}
                    max={Math.max(stats.trips.total, 1)}
                    color="bg-amber-500"
                  />
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-zinc-900 mb-4">
                Critical Alerts
              </h2>
              <div className="space-y-3">
                {stats.expiringLicenses > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-rose-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        License Expiry
                      </p>
                      <p className="text-xs text-zinc-500">
                        {stats.expiringLicenses} driver(s) license expiring within
                        30 days
                      </p>
                    </div>
                  </div>
                )}
                {stats.maintenanceActive > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        Vehicles In Shop
                      </p>
                      <p className="text-xs text-zinc-500">
                        {stats.maintenanceActive} vehicle(s) currently under
                        maintenance
                      </p>
                    </div>
                  </div>
                )}
                {stats.expiringLicenses === 0 && stats.maintenanceActive === 0 && (
                  <p className="text-sm text-green-600">
                    No critical alerts at this time.
                  </p>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <Card>
              <h2 className="text-lg font-semibold text-zinc-900 mb-3">
                Trip Status
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Draft</span>
                  <span className="text-zinc-900">{stats.trips.draft}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Dispatched</span>
                  <span className="text-zinc-900">{stats.trips.dispatched}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Completed</span>
                  <span className="text-zinc-900">{stats.trips.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Cancelled</span>
                  <span className="text-zinc-900">{stats.trips.cancelled}</span>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-zinc-900 mb-3">
                Drivers
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Available</span>
                  <span className="text-zinc-900">{stats.drivers.available}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">On Trip</span>
                  <span className="text-zinc-900">{stats.drivers.onTrip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Off Duty</span>
                  <span className="text-zinc-900">{stats.drivers.offDuty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Suspended</span>
                  <span className="text-zinc-900">{stats.drivers.suspended}</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
