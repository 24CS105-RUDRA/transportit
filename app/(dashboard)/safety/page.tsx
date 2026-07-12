"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { TableSkeleton } from "@/components/Skeleton";

type Driver = {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  safetyScore: number;
  status: string;
};

function daysUntil(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function expiryBadge(days: number) {
  if (days < 0)
    return { label: "Expired", cls: "bg-rose-100 text-rose-700" };
  if (days <= 30)
    return { label: `Expires in ${days}d`, cls: "bg-amber-100 text-amber-700" };
  return { label: "Valid", cls: "bg-emerald-100 text-emerald-700" };
}

export default function SafetyPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/drivers", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return res.json();
      })
      .then((d) => d && setDrivers(d.drivers ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TableSkeleton rows={6} cols={5} />;
  if (error) return <p className="text-sm text-rose-600">Error: {error}</p>;

  const withDays = drivers.map((d) => ({
    ...d,
    days: daysUntil(d.licenseExpiryDate),
  }));
  const expiringSoon = withDays
    .filter((d) => d.days <= 30)
    .sort((a, b) => a.days - b.days);
  const leaderboard = [...drivers].sort((a, b) => b.safetyScore - a.safetyScore).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Safety</h1>
          <p className="mt-2 text-lg text-zinc-600">
            License compliance and driver safety leaderboard
          </p>
        </div>
        <button
          onClick={async () => {
            const res = await fetch("/api/safety/license-reminders", { credentials: "include" });
            const data = await res.json();
            alert(data.message);
          }}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Send License Reminders (stub)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-zinc-500">Expired Licenses</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">
            {withDays.filter((d) => d.days < 0).length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Expiring (≤30d)</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {expiringSoon.filter((d) => d.days >= 0).length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Avg Safety Score</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {drivers.length
              ? Math.round(
                  drivers.reduce((a, d) => a + d.safetyScore, 0) / drivers.length
                )
              : 0}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          License Expiry Watchlist
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="py-2 pr-4">Driver</th>
                <th className="py-2 pr-4">License</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Expiry</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {withDays
                .sort((a, b) => a.days - b.days)
                .map((d) => {
                  const badge = expiryBadge(d.days);
                  return (
                    <tr key={d.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-4 font-medium text-zinc-900">
                        {d.name}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600">{d.licenseNumber}</td>
                      <td className="py-2 pr-4 text-zinc-600">{d.licenseCategory}</td>
                      <td className="py-2 pr-4 text-zinc-600">
                        {new Date(d.licenseExpiryDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              {withDays.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-zinc-500">
                    No drivers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Safety Leaderboard
        </h2>
        <div className="space-y-2">
          {leaderboard.map((d, i) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-zinc-100 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-zinc-900">{d.name}</p>
                  <p className="text-xs text-zinc-500">{d.licenseNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-emerald-600">
                  {d.safetyScore}
                </p>
                <p className="text-xs text-zinc-500">safety score</p>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="py-4 text-center text-zinc-500">No drivers found.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
