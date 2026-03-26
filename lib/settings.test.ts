import { describe, expect, it } from "vitest";

import { vi } from "vitest";

import {
  buildRoleAuditLogPayload,
  buildSystemSettingAuditLogPayload,
  generateTemporaryPassword,
} from "@/lib/settings-audit";

describe("generateTemporaryPassword", () => {
  it("creates a mixed-character temporary password", () => {
    const password = generateTemporaryPassword();

    expect(password.length).toBeGreaterThanOrEqual(12);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
  });
});

describe("buildRoleAuditLogPayload", () => {
  it("captures old and new role values", () => {
    const payload = buildRoleAuditLogPayload({
      userId: "user-1",
      changedById: "admin-1",
      previousRole: "TECHNICIAN",
      nextRole: "COORDINATOR",
      userEmail: "tech@marlin.test",
      userName: "Test Tech",
    });

    expect(payload).toMatchObject({
      entityType: "USER_ROLE",
      entityId: "user-1",
      changedById: "admin-1",
      oldValues: { role: "TECHNICIAN" },
      newValues: { role: "COORDINATOR" },
    });
  });
});

describe("buildSystemSettingAuditLogPayload", () => {
  it("captures old and new system setting values", () => {
    const payload = buildSystemSettingAuditLogPayload({
      key: "jobs.on_hold_default_days",
      changedById: "admin-1",
      previousValue: "7",
      nextValue: "14",
    });

    expect(payload).toMatchObject({
      entityType: "SYSTEM_SETTING",
      entityId: "jobs.on_hold_default_days",
      changedById: "admin-1",
      oldValues: { value: "7" },
      newValues: { value: "14" },
    });
  });
});
