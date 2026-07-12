"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { TableSkeleton } from "@/components/Skeleton";

type AuditLog = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actorEmail: string | null;
  createdAt: string;
};

const actionColor: Record<string, string> = {
  CREATE: "bg-blue-100 text-blue-700",
  DISPATCH: "bg-indigo-100 text-indigo-700",
  COMPLETE: "bg-emerald-100 text-emerald-700",
  CANCEL: "bg-rose-100 text-rose-700",
  STATUS_CHANGE: "bg-amber-100 text-amber-700",
  CLOSE: "bg-zinc-100 text-zinc-700",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/audit", { credentials: "include" })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return res.json();
      })
      .then((d) => d && setLogs(d.logs ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <TableSkeleton rows={8} cols={6} />;
  if (error) return <p className="text-sm text-rose-600">Error: {error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Audit Log</h1>
        <p className="mt-2 text-lg text-zinc-600">
          Chronological record of status changes across trips, vehicles, drivers and maintenance.
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Actor</th>
                <th className="py-2 pr-4">Entity</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Transition</th>
                <th className="py-2 pr-4">Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-4 text-zinc-600">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-zinc-600">{l.actorEmail ?? "—"}</td>
                  <td className="py-2 pr-4 font-medium text-zinc-900">
                    {l.entityType}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        actionColor[l.action] ?? "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {l.action}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-zinc-600">
                    {l.fromStatus ? `${l.fromStatus} → ` : ""}
                    {l.toStatus ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-zinc-600">{l.note ?? "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-zinc-500">
                    No audit entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
