import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";

import { canAccessPath, getNavigationForRole, getRoleHomePath } from "@/lib/route-access";

describe("route access", () => {
  it("sends technicians to the mobile workflow", () => {
    expect(getRoleHomePath(Role.TECHNICIAN)).toBe("/my-jobs");
    expect(canAccessPath(Role.TECHNICIAN, "/my-jobs")).toBe(true);
    expect(canAccessPath(Role.TECHNICIAN, "/jobs")).toBe(true);
    expect(canAccessPath(Role.TECHNICIAN, "/dashboard")).toBe(false);
    expect(canAccessPath(Role.TECHNICIAN, "/settings")).toBe(false);
    expect(canAccessPath(Role.TECHNICIAN, "/dispatch")).toBe(false);
  });

  it("keeps admin navigation and access rules aligned", () => {
    const adminNavigation = getNavigationForRole(Role.ADMIN).map((item) => item.href);

    expect(getRoleHomePath(Role.ADMIN)).toBe("/");
    expect(adminNavigation).toContain("/dashboard");
    expect(adminNavigation).toContain("/settings");
    expect(adminNavigation).not.toContain("/my-jobs");
    expect(canAccessPath(Role.ADMIN, "/dashboard")).toBe(true);
    expect(canAccessPath(Role.ADMIN, "/jobs/new")).toBe(true);
    expect(canAccessPath(Role.ADMIN, "/settings")).toBe(true);
    expect(canAccessPath(Role.ADMIN, "/my-jobs")).toBe(false);
  });

  it("allows workshop operations views but not admin-only settings", () => {
    const chiefNavigation = getNavigationForRole(Role.WORKSHOP_CHIEF).map((item) => item.href);

    expect(chiefNavigation).toContain("/dispatch");
    expect(chiefNavigation).not.toContain("/settings");
    expect(canAccessPath(Role.WORKSHOP_CHIEF, "/dispatch/weekly")).toBe(true);
    expect(canAccessPath(Role.WORKSHOP_CHIEF, "/settings")).toBe(false);
  });
});
