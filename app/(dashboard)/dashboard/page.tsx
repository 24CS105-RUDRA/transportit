"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, KpiCard } from "@/components/Card";

type Stats = {
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

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard/stats", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then((data) => {
        if (active && data) setStats(data);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">TransitOps Dashboard</h1>
        <p className="mt-2 text-lg text-zinc-600">
          Smart Transport Operations Platform - Fleet Management System
        </p>
      </div>

      {loading && (
        <p className="text-sm text-zinc-500">Loading live metrics…</p>
      )}
      {error && (
        <p className="text-sm text-rose-600">Error: {error}</p>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Vehicles"
              value={stats.vehicles.total}
              sub={`${stats.vehicles.available} Available, ${stats.vehicles.onTrip} On Trip`}
              href="/fleet"
            />
            <KpiCard
              label="Active Drivers"
              value={stats.drivers.total}
              sub={`${stats.drivers.available} Available, ${stats.drivers.onTrip} On Trip`}
              href="/drivers"
            />
            <KpiCard
              label="Trips (Total)"
              value={stats.trips.total}
              sub={`${stats.trips.dispatched} Dispatched, ${stats.trips.completed} Completed`}
              href="/trips"
            />
            <KpiCard
              label="Fleet Utilization"
              value={`${stats.fleetUtilization}%`}
              sub={`${stats.vehicles.onTrip} of ${stats.vehicles.total - stats.vehicles.retired} active`}
              href="/maintenance"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-semibold text-zinc-900 mb-4">
                Fleet Overview
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Available</span>
                  <span className="font-medium text-zinc-900">
                    {stats.vehicles.available}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">On Trip</span>
                  <span className="font-medium text-zinc-900">
                    {stats.vehicles.onTrip}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">In Shop</span>
                  <span className="font-medium text-zinc-900">
                    {stats.vehicles.inShop}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Retired</span>
                  <span className="font-medium text-zinc-900">
                    {stats.vehicles.retired}
                  </span>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <h2 className="text-lg font-semibold text-zinc-900 mb-3">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <button
                  onClick={() => router.push("/drivers")}
                  className="w-full text-left px-3 py-2 text-sm bg-zinc-50 hover:bg-zinc-100 rounded transition-colors"
                >
                  + Manage Drivers
                </button>
                <button
                  onClick={() => router.push("/fleet")}
                  className="w-full text-left px-3 py-2 text-sm bg-zinc-50 hover:bg-zinc-100 rounded transition-colors"
                >
                  + Register Vehicle
                </button>
                <button
                  onClick={() => router.push("/trips")}
                  className="w-full text-left px-3 py-2 text-sm bg-zinc-50 hover:bg-zinc-100 rounded transition-colors"
                >
                  + Create Trip
                </button>
              </div>
            </Card>

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
