"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import { ModuleKey } from "@/lib/rbac";

const NAV_ITEMS: { module: ModuleKey; href: string; label: string }[] = [
  { module: "dashboard", href: "/dashboard", label: "Dashboard" },
  { module: "fleet", href: "/fleet", label: "Vehicle Registry" },
  { module: "drivers", href: "/drivers", label: "Drivers" },
  { module: "trips", href: "/trips", label: "Trip Dispatcher" },
  { module: "maintenance", href: "/maintenance", label: "Maintenance" },
  { module: "audit", href: "/audit", label: "Audit Log" },
  { module: "fuelExpenses", href: "/fuel-expenses", label: "Fuel & Expenses" },
  { module: "analytics", href: "/analytics", label: "Reports & Analytics" },
  { module: "safety", href: "/safety", label: "Safety" },
  { module: "settings", href: "/settings", label: "Settings" },
];

const ALL_MODULES: ModuleKey[] = [
  "dashboard", "fleet", "drivers", "trips", "maintenance",
  "audit", "fuelExpenses", "analytics", "safety", "settings",
];

const ROLE_MODULES: Record<UserRole, ModuleKey[]> = {
  SUPER_ADMIN: ALL_MODULES,
  FLEET_MANAGER: ["dashboard", "fleet", "maintenance", "analytics", "settings", "audit"],
  DISPATCHER: ["dashboard", "trips", "audit"],
  SAFETY_OFFICER: ["dashboard", "drivers", "safety"],
  FINANCIAL_ANALYST: ["dashboard", "fuelExpenses", "analytics"],
};

export function Sidebar({
  role,
  name,
  email,
}: {
  role: UserRole;
  name: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = new Set(ROLE_MODULES[role] ?? []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-5 py-5">
        <p className="text-lg font-semibold text-zinc-900">TransitOps</p>
        <p className="text-xs text-zinc-500">Transport Operations</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.filter((item) => allowed.has(item.module)).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-100 px-5 py-4">
        <p className="truncate text-sm font-medium text-zinc-900">{name}</p>
        <p className="truncate text-xs text-zinc-500">{email}</p>
        <p className="mt-1 text-xs text-zinc-500">{role.replaceAll("_", " ")}</p>
        <button
          onClick={handleLogout}
          className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
