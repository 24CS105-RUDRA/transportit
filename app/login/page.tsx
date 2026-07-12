"use client";

import { useState } from "react";
import { inputClass, buttonPrimaryClass } from "@/components/FormField";

const DEMO_ACCOUNTS = [
  { label: "Fleet Manager", email: "fleetmanager@transitops.com" },
  { label: "Dispatcher", email: "dispatcher@transitops.com" },
  { label: "Safety Officer", email: "safety@transitops.com" },
  { label: "Financial Analyst", email: "finance@transitops.com" },
];

const ROLES = ["Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"];

const FEATURES = ["Trip Planner", "Maintenance", "Safety Officer", "Financial Analyst"];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (!role) {
      setError("Please select a role");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const contentType = res.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => "");
      if (!res.ok) {
        setError(typeof data === "object" && data && "error" in data ? data.error : "Login failed");
        return;
      }
      // Hard navigation guarantees the freshly-set auth cookie is sent and the
      // dashboard layout (which reads it server-side) renders correctly.
      window.location.href = "/dashboard";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1">
      <div className="hidden flex-1 items-center justify-center bg-zinc-900 p-12 lg:flex">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-white">TransitOps</h1>
          <p className="mt-3 text-lg text-zinc-300">Smart Transport Operations Platform</p>
          <div className="mt-8 flex flex-col gap-3">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3 text-left text-sm text-zinc-400">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <h1 className="text-2xl font-bold text-zinc-900">TransitOps</h1>
            <p className="mt-1 text-sm text-zinc-500">Smart Transport Operations Platform</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@transitops.com"
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-zinc-700">Role</label>
              <select
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={inputClass}
              >
                <option value="">Select your role</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
            <button type="submit" disabled={loading} className={`${buttonPrimaryClass} w-full`}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 border-t border-zinc-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Demo accounts (password: password123)
            </p>
            <div className="flex flex-col gap-1">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setRole(acc.label);
                  }}
                  className="text-left text-xs text-zinc-500 hover:text-zinc-900"
                >
                  {acc.label} — {acc.email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
