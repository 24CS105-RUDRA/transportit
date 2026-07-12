"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import { ModuleKey } from "@/lib/rbac";

const NAV_ITEMS: { module: ModuleKey; href: string; label: string; icon: string }[] = [
  { module: "dashboard", href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { module: "fleet", href: "/fleet", label: "Vehicle Registry", icon: "M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11h18M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6" },
  { module: "drivers", href: "/drivers", label: "Drivers", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { module: "trips", href: "/trips", label: "Trip Dispatcher", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { module: "maintenance", href: "/maintenance", label: "Maintenance", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { module: "audit", href: "/audit", label: "Audit Log", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { module: "fuelExpenses", href: "/fuel-expenses", label: "Fuel & Expenses", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { module: "analytics", href: "/analytics", label: "Reports & Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { module: "safety", href: "/safety", label: "Safety", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  { module: "settings", href: "/settings", label: "Settings", icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
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

function Icon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width={18}
      height={18}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

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
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-5 py-5">
        <p className="text-lg font-semibold text-zinc-900">TransitOps</p>
        <p className="text-xs text-zinc-500">Transport Operations</p>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.filter((item) => allowed.has(item.module)).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`hover-slide flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-zinc-900 text-white shadow-md"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <Icon
                d={item.icon}
                className={active ? "text-white" : "text-zinc-400"}
              />
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
