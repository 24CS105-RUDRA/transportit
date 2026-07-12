import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

export const MODULES = {
  dashboard: "dashboard",
  fleet: "fleet",
  drivers: "drivers",
  trips: "trips",
  maintenance: "maintenance",
  fuelExpenses: "fuelExpenses",
  analytics: "analytics",
  settings: "settings",
  safety: "safety",
  audit: "audit",
} as const;

export type ModuleKey = (typeof MODULES)[keyof typeof MODULES];

const ALL_MODULES: ModuleKey[] = Object.values(MODULES);

export const ROLE_MODULE_ACCESS: Record<UserRole, ModuleKey[]> = {
  SUPER_ADMIN: ALL_MODULES,
  FLEET_MANAGER: [
    "dashboard",
    "fleet",
    "maintenance",
    "analytics",
    "settings",
    "audit",
  ],
  DISPATCHER: ["dashboard", "trips", "audit"],
  SAFETY_OFFICER: ["dashboard", "drivers", "safety"],
  FINANCIAL_ANALYST: ["dashboard", "fuelExpenses", "analytics"],
};

export function canAccessModule(role: UserRole, moduleKey: ModuleKey): boolean {
  return ROLE_MODULE_ACCESS[role]?.includes(moduleKey) ?? false;
}

function parseRolePermissions(raw: string | null): Record<string, string[]> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const result: Record<string, string[]> = {};
    for (const [role, val] of Object.entries(parsed)) {
      if (Array.isArray(val)) {
        result[role] = val.filter((v) => typeof v === "string");
      } else if (typeof val === "string") {
        result[role] = val.split(",").map((s) => s.trim());
      }
    }
    return result;
  } catch {
    return null;
  }
}

export async function getDynamicModules(role: UserRole): Promise<ModuleKey[]> {
  try {
    const settings = await prisma.settings.findFirst();
    if (!settings?.rolePermissions) return ROLE_MODULE_ACCESS[role] ?? [];
    const custom = parseRolePermissions(settings.rolePermissions);
    if (custom && custom[role]) {
      return custom[role].filter((m): m is ModuleKey => (ALL_MODULES as string[]).includes(m));
    }
    return ROLE_MODULE_ACCESS[role] ?? [];
  } catch {
    return ROLE_MODULE_ACCESS[role] ?? [];
  }
}

export async function canAccessModuleDynamic(role: UserRole, moduleKey: ModuleKey): Promise<boolean> {
  const modules = await getDynamicModules(role);
  return modules.includes(moduleKey);
}

export const ROUTE_MODULE_MAP: { prefix: string; module: ModuleKey }[] = [
  { prefix: "/dashboard", module: "dashboard" },
  { prefix: "/fleet", module: "fleet" },
  { prefix: "/drivers", module: "drivers" },
  { prefix: "/trips", module: "trips" },
  { prefix: "/maintenance", module: "maintenance" },
  { prefix: "/fuel-expenses", module: "fuelExpenses" },
  { prefix: "/analytics", module: "analytics" },
  { prefix: "/settings", module: "settings" },
  { prefix: "/safety", module: "safety" },
  { prefix: "/audit", module: "audit" },
];

export function moduleForPath(pathname: string): ModuleKey | null {
  const match = ROUTE_MODULE_MAP.find((r) => pathname.startsWith(r.prefix));
  return match ? match.module : null;
}
