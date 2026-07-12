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

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics", { credentials: "include" })
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
  }, []);

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

  if (loading) return <p className="text-sm text-zinc-500">Loading analytics…</p>;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Analytics</h1>
          <p className="mt-2 text-lg text-zinc-600">Fleet performance and cost intelligence</p>
        </div>
        <button
          onClick={downloadCsv}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Fleet Fuel Efficiency" value={`${data.fleetFuelEfficiency} km/L`} />
        <KpiCard label="Operational Cost" value={`$${data.operationalCost.toLocaleString()}`} />
        <KpiCard label="Total Revenue" value={`$${data.totalRevenue.toLocaleString()}`} />
        <KpiCard label="Fleet Utilization" value={`${data.fleetUtilization}%`} />
      </div>

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
              ${data.totalFuelCost.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between border-b border-zinc-100 py-2">
            <span className="text-sm text-zinc-600">Total Maintenance</span>
            <span className="text-sm font-medium text-zinc-900">
              ${data.totalMaintenance.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
