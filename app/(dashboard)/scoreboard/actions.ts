"use server";

import { revalidatePath } from "next/cache";
import { EvaluatorType, Role } from "@prisma/client";
import { z } from "zod";

import type { MonthlyEvaluationActionState } from "@/app/(dashboard)/scoreboard/state";
import { initialMonthlyEvaluationActionState } from "@/app/(dashboard)/scoreboard/state";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeMonthlyEval } from "@/lib/scoring";

const monthSchema = z.coerce.number().int().min(1).max(12);
const yearSchema = z.coerce.number().int().min(2024).max(2100);

const workshopRowSchema = z.object({
  employeeId: z.string().uuid(),
  q1: z.number().int().min(1).max(5),
  q2: z.number().int().min(1).max(5),
  q3: z.number().int().min(1).max(5),
  notes: z.string().trim().max(1000).optional(),
});

const coordinatorRowSchema = z.object({
  employeeId: z.string().uuid(),
  q1: z.number().int().min(1).max(5),
  q2: z.number().int().min(1).max(5),
  q3: z.number().int().min(1).max(5),
  q4: z.number().int().min(1).max(5),
  q5: z.number().int().min(1).max(5),
});

function parsePayload<T>(rawPayload: FormDataEntryValue | null, schema: z.ZodSchema<T>) {
  if (typeof rawPayload !== "string") {
    throw new Error("Değerlendirme verisi okunamadi.");
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawPayload);
  } catch {
    throw new Error("Değerlendirme payload'i gecerli JSON degil.");
  }

  return schema.parse(parsedJson);
}

async function assertTechnicianIds(employeeIds: string[]) {
  const technicians = await prisma.user.findMany({
    where: {
      id: { in: employeeIds },
      role: Role.TECHNICIAN,
    },
    select: { id: true },
  });

  if (technicians.length !== employeeIds.length) {
    throw new Error("Degerlendirilecek personelden biri bulunamadi.");
  }
}

export async function saveWorkshopEvaluationsAction(
  _prevState: MonthlyEvaluationActionState,
  formData: FormData
): Promise<MonthlyEvaluationActionState> {
  try {
    const actor = await requireRoles([Role.WORKSHOP_CHIEF, Role.ADMIN]);
    const month = monthSchema.parse(formData.get("month"));
    const year = yearSchema.parse(formData.get("year"));
    const rows = parsePayload(
      formData.get("payload"),
      z.array(workshopRowSchema).min(1)
    );

    await assertTechnicianIds(rows.map((row) => row.employeeId));

    await prisma.$transaction(
      rows.map((row) =>
        prisma.monthlyEvaluation.upsert({
          where: {
            employeeId_evaluatorType_month_year: {
              employeeId: row.employeeId,
              evaluatorType: EvaluatorType.WORKSHOP_CHIEF,
              month,
              year,
            },
          },
          create: {
            employeeId: row.employeeId,
            evaluatorId: actor.id,
            evaluatorType: EvaluatorType.WORKSHOP_CHIEF,
            month,
            year,
            wc_q1_technical: row.q1,
            wc_q2_discipline: row.q2,
            wc_q3_growth: row.q3,
            wc_notes: row.notes || null,
            normalizedScore: normalizeMonthlyEval([row.q1, row.q2, row.q3]),
          },
          update: {
            evaluatorId: actor.id,
            wc_q1_technical: row.q1,
            wc_q2_discipline: row.q2,
            wc_q3_growth: row.q3,
            wc_notes: row.notes || null,
            normalizedScore: normalizeMonthlyEval([row.q1, row.q2, row.q3]),
          },
        })
      )
    );

    revalidatePath("/scoreboard");

    return {
      success: true,
      error: null,
      updatedCount: rows.length,
    };
  } catch (error) {
    return {
      ...initialMonthlyEvaluationActionState,
      error:
        error instanceof Error
          ? error.message
          : "Usta değerlendirmesi kaydedilirken beklenmeyen bir hata oluştu.",
    };
  }
}

export async function saveCoordinatorEvaluationsAction(
  _prevState: MonthlyEvaluationActionState,
  formData: FormData
): Promise<MonthlyEvaluationActionState> {
  try {
    const actor = await requireRoles([Role.COORDINATOR, Role.ADMIN]);
    const month = monthSchema.parse(formData.get("month"));
    const year = yearSchema.parse(formData.get("year"));
    const rows = parsePayload(
      formData.get("payload"),
      z.array(coordinatorRowSchema).min(1)
    );

    await assertTechnicianIds(rows.map((row) => row.employeeId));

    await prisma.$transaction(
      rows.map((row) =>
        prisma.monthlyEvaluation.upsert({
          where: {
            employeeId_evaluatorType_month_year: {
              employeeId: row.employeeId,
              evaluatorType: EvaluatorType.TECHNICAL_COORDINATOR,
              month,
              year,
            },
          },
          create: {
            employeeId: row.employeeId,
            evaluatorId: actor.id,
            evaluatorType: EvaluatorType.TECHNICAL_COORDINATOR,
            month,
            year,
            tc_q1_compliance: row.q1,
            tc_q2_safety: row.q2,
            tc_q3_represent: row.q3,
            tc_q4_teamwork: row.q4,
            tc_q5_growth: row.q5,
            normalizedScore: normalizeMonthlyEval([row.q1, row.q2, row.q3, row.q4, row.q5]),
          },
          update: {
            evaluatorId: actor.id,
            tc_q1_compliance: row.q1,
            tc_q2_safety: row.q2,
            tc_q3_represent: row.q3,
            tc_q4_teamwork: row.q4,
            tc_q5_growth: row.q5,
            normalizedScore: normalizeMonthlyEval([row.q1, row.q2, row.q3, row.q4, row.q5]),
          },
        })
      )
    );

    revalidatePath("/scoreboard");

    return {
      success: true,
      error: null,
      updatedCount: rows.length,
    };
  } catch (error) {
    return {
      ...initialMonthlyEvaluationActionState,
      error:
        error instanceof Error
          ? error.message
          : "Koordinatör değerlendirmesi kaydedilirken beklenmeyen bir hata oluştu.",
    };
  }
}

