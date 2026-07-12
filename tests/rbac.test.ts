import { describe, it, expect } from "vitest";
import {
  canAccessModule,
  moduleForPath,
  ROLE_MODULE_ACCESS,
} from "@/lib/rbac";

describe("canAccessModule", () => {
  it("grants fleet manager access to fleet and maintenance", () => {
    expect(canAccessModule("FLEET_MANAGER", "fleet")).toBe(true);
    expect(canAccessModule("FLEET_MANAGER", "maintenance")).toBe(true);
  });

  it("denies fleet manager access to trips and fuelExpenses", () => {
    expect(canAccessModule("FLEET_MANAGER", "trips")).toBe(false);
    expect(canAccessModule("FLEET_MANAGER", "fuelExpenses")).toBe(false);
  });

  it("grants dispatcher access only to dashboard and trips", () => {
    expect(canAccessModule("DISPATCHER", "trips")).toBe(true);
    expect(canAccessModule("DISPATCHER", "dashboard")).toBe(true);
    expect(canAccessModule("DISPATCHER", "maintenance")).toBe(false);
  });

  it("grants financial analyst access to fuelExpenses and analytics", () => {
    expect(canAccessModule("FINANCIAL_ANALYST", "fuelExpenses")).toBe(true);
    expect(canAccessModule("FINANCIAL_ANALYST", "analytics")).toBe(true);
    expect(canAccessModule("FINANCIAL_ANALYST", "trips")).toBe(false);
  });

  it("every role can access the dashboard", () => {
    for (const role of Object.keys(ROLE_MODULE_ACCESS)) {
      expect(canAccessModule(role as never, "dashboard")).toBe(true);
    }
  });
});

describe("moduleForPath", () => {
  it("maps route prefixes to modules", () => {
    expect(moduleForPath("/trips")).toBe("trips");
    expect(moduleForPath("/fuel-expenses")).toBe("fuelExpenses");
    expect(moduleForPath("/maintenance")).toBe("maintenance");
  });

  it("returns null for unknown paths", () => {
    expect(moduleForPath("/login")).toBeNull();
    expect(moduleForPath("/")).toBeNull();
  });
});
