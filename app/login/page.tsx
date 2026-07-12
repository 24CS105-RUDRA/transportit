"use client";

import { useState } from "react";
import { inputClass, buttonPrimaryClass } from "@/components/FormField";

const DEMO_ACCOUNTS = [
  { label: "Fleet Manager", email: "fleetmanager@transitops.com" },
  { label: "Dispatcher", email: "dispatcher@transitops.com" },
  { label: "Safety Officer", email: "safety@transitops.com" },
  { label: "Financial Analyst", email: "finance@transitops.com" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
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
    <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">TransitOps</h1>
        <p className="mt-1 text-sm text-zinc-500">Smart Transport Operations Platform</p>

        <form onSubmit={handleSubmit} className="mt-6">
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
                onClick={() => setEmail(acc.email)}
                className="text-left text-xs text-zinc-500 hover:text-zinc-900"
              >
                {acc.label} — {acc.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
