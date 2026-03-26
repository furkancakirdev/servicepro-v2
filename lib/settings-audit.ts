import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";

export function generateTemporaryPassword(length = 14) {
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = `${lowercase}${uppercase}${digits}`;
  const required = [
    lowercase[crypto.randomInt(0, lowercase.length)],
    uppercase[crypto.randomInt(0, uppercase.length)],
    digits[crypto.randomInt(0, digits.length)],
  ];

  while (required.length < length) {
    required.push(all[crypto.randomInt(0, all.length)]);
  }

  return required
    .sort(() => crypto.randomInt(0, 2) - 0.5)
    .join("");
}

export function buildRoleAuditLogPayload(input: {
  userId: string;
  changedById: string;
  previousRole: string;
  nextRole: string;
  userEmail: string;
  userName: string;
}) {
  return {
    entityType: "USER_ROLE",
    entityId: input.userId,
    changedById: input.changedById,
    reason: `Rol degisimi: ${input.userName} <${input.userEmail}>`,
    oldValues: {
      role: input.previousRole,
    },
    newValues: {
      role: input.nextRole,
    },
  } satisfies Prisma.EvaluationChangeLogUncheckedCreateInput;
}

export function buildSystemSettingAuditLogPayload(input: {
  key: string;
  changedById: string;
  previousValue: string | null;
  nextValue: string;
}) {
  return {
    entityType: "SYSTEM_SETTING",
    entityId: input.key,
    changedById: input.changedById,
    reason: `Sistem ayari guncellendi: ${input.key}`,
    oldValues: {
      value: input.previousValue,
    },
    newValues: {
      value: input.nextValue,
    },
  } satisfies Prisma.EvaluationChangeLogUncheckedCreateInput;
}
