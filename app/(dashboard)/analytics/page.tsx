"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { Card, KpiCard } from "@/components/Card";
import { KpiSkeletonGrid, TableSkeleton } from "@/components/Skeleton";
import { formatCurrency } from "@/lib/format";

function ProgressBar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
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

type Analytics = {
  fleetFuelEfficiency: number;
  operationalCost: number;
  totalRevenue: number;
  fleetUtilization: number;
  totalFuelCost: number;
  totalMaintenance: number;
  topCostliestVehicles: { plate: string; model: string; cost: number }[];
  vehicleRoi: { plate: string; model: string; revenue: number; cost: number; roi: number }[];
};

const PRESETS = [
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
  { label: "This Year", days: 365 },
  { label: "All Time", days: 0 },
] as const;

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activePreset, setActivePreset] = useState<number | null>(null);

  function applyPreset(days: number, idx: number) {
    setActivePreset(idx);
    if (days === 0) {
      setFrom("");
      setTo("");
    } else {
      const now = new Date();
      const end = now.toISOString().split("T")[0];
      const start = new Date(now.getTime() - days * 86400000).toISOString().split("T")[0];
      setFrom(start);
      setTo(end);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    fetch(`/api/analytics${qs ? `?${qs}` : ""}`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return res.json();
      })
      .then((d) => d && setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [from, to]);

  function downloadCsv() {
    if (!data) return;
    const rows = [
      ["Vehicle", "Model", "Cost", "Revenue", "ROI %"],
      ...data.vehicleRoi.map((v) => [
        v.plate,
        v.model,
        v.cost.toString(),
        v.revenue.toString(),
        ((v.roi * 100).toFixed(1)),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transitops-analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <KpiSkeletonGrid count={4} />
        <TableSkeleton rows={6} cols={5} />
        <TableSkeleton rows={6} cols={5} />
      </div>
    );
  }
  if (error) return <p className="text-sm text-rose-600">Error: {error}</p>;
  if (!data) return <p className="text-sm text-zinc-500">No data.</p>;

  const costData = data.topCostliestVehicles.map((v) => ({
    name: v.plate,
    cost: v.cost,
  }));
  const roiData = data.vehicleRoi.map((v) => ({
    name: v.plate,
    roi: Number((v.roi * 100).toFixed(1)),
  }));
  const costColors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"];

  const filterLabel = from || to
    ? `${from || "Start"} to ${to || "Now"}`
    : "All Time";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Analytics</h1>
          <p className="mt-2 text-lg text-zinc-600">Fleet performance and cost intelligence</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadCsv}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Print / PDF
          </button>
        </div>
      </div>

      {/* Print header — only shows when printing */}
      <div className="hidden print-header">
        <h1 className="text-2xl font-bold">TransitOps Analytics Report</h1>
        <p className="text-sm text-zinc-600">Period: {filterLabel}</p>
        <p className="text-xs text-zinc-400">Generated: {new Date().toLocaleDateString("en-IN")}</p>
      </div>

      <Card className="no-print">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.days, i)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${
                  activePreset === i
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-zinc-200" />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setActivePreset(null); }}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setActivePreset(null); }}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
            />
          </div>
          {(from || to) && (
            <button
              onClick={() => { setFrom(""); setTo(""); setActivePreset(null); }}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Clear
            </button>
          )}
          <span className="text-xs text-zinc-400">
            Filters fuel, maintenance & revenue by date
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Fleet Fuel Efficiency" value={`${data.fleetFuelEfficiency} km/L`} />
        <KpiCard label="Operational Cost" value={formatCurrency(data.operationalCost)} />
        <KpiCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} />
        <KpiCard label="Fleet Utilization" value={`${data.fleetUtilization}%`} />
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">Fleet Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-zinc-700 mb-2">Fleet Utilization</p>
            <ProgressBar value={data.fleetUtilization} max={100} color="bg-indigo-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-700 mb-2">Fuel Efficiency</p>
            <ProgressBar value={data.fleetFuelEfficiency} max={20} color="bg-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-700 mb-2">Revenue vs Cost</p>
            <ProgressBar
              value={data.totalRevenue}
              max={Math.max(data.totalRevenue + data.operationalCost, 1)}
              color="bg-blue-500"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-700 mb-2">Maintenance Spend</p>
            <ProgressBar
              value={data.totalMaintenance}
              max={Math.max(data.totalFuelCost + data.totalMaintenance, 1)}
              color="bg-amber-500"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Top Costliest Vehicles</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="cost" name="Cost">
                  {costData.map((_, i) => (
                    <Cell key={i} fill={costColors[i % costColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Vehicle ROI (%)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="roi" fill="#2563eb" name="ROI %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">Cost Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between border-b border-zinc-100 py-2">
            <span className="text-sm text-zinc-600">Total Fuel Cost</span>
            <span className="text-sm font-medium text-zinc-900">
              {formatCurrency(data.totalFuelCost)}
            </span>
          </div>
          <div className="flex justify-between border-b border-zinc-100 py-2">
            <span className="text-sm text-zinc-600">Total Maintenance</span>
            <span className="text-sm font-medium text-zinc-900">
               {formatCurrency(data.totalMaintenance)}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">Insights</h2>
        <div className="space-y-3">
          {data.fleetUtilization < 50 && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Fleet utilization is at {data.fleetUtilization}% — consider reassigning idle vehicles.
            </div>
          )}
          {data.totalMaintenance > data.totalFuelCost * 0.5 && (
            <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Maintenance costs are high relative to fuel spend — review vehicle age and condition.
            </div>
          )}
          {data.fleetFuelEfficiency < 5 && (
            <div className="rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-800">
              Fuel efficiency is below 5 km/L — check for inefficient routes or vehicles.
            </div>
          )}
          {data.vehicleRoi.some(v => v.roi < 0) && (
            <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {data.vehicleRoi.filter(v => v.roi < 0).length} vehicle(s) have negative ROI — review cost structure.
            </div>
          )}
          {data.fleetUtilization >= 70 && data.fleetFuelEfficiency >= 8 && (
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Fleet is performing well — {data.fleetUtilization}% utilization with {data.fleetFuelEfficiency} km/L efficiency.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
