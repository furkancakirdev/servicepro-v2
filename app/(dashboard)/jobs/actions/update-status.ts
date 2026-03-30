"use server";

import { redirect } from "next/navigation";
import { HoldReason, JobStatus, Role } from "@prisma/client";

import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ON_HOLD_DAYS, getOnHoldDefaultDays } from "@/lib/system-settings";

import {
  allowedTransitions,
  cancelJobSchema,
  holdReasonSchema,
  jobStatusSchema,
  optionalString,
  parseCheckbox,
  revalidateAfterCancellation,
  revalidateAfterHoldUpdate,
  revalidateAfterStatusChange,
} from "./shared";

type UpdateJobStatusOptions = {
  holdReason?: HoldReason;
  reminderDays?: number;
  convertKesif?: boolean;
};

export async function updateJobStatus(
  jobId: string,
  newStatus: JobStatus,
  options: UpdateJobStatusOptions = {}
) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);
  const job = await prisma.serviceJob.findUnique({
    where: { id: jobId },
    include: {
      deliveryReport: true,
      evaluation: true,
    },
  });

  if (!job) {
    throw new Error("Ä°ÅŸ kaydÄ± bulunamadÄ±.");
  }

  if (!allowedTransitions[job.status].includes(newStatus)) {
    throw new Error("Bu durum geÃ§iÅŸi desteklenmiyor.");
  }

  if (newStatus === JobStatus.KAPANDI && (!job.deliveryReport || !job.evaluation)) {
    throw new Error("Ä°ÅŸ kapatma iÃ§in teslim raporu ve Form 1 puanlama zorunlu.");
  }

  const now = new Date();
  const holdUntil =
    newStatus === JobStatus.BEKLEMEDE && options.reminderDays
      ? new Date(now.getTime() + options.reminderDays * 24 * 60 * 60 * 1000)
      : null;

  return prisma.serviceJob.update({
    where: { id: jobId },
    data: {
      status: newStatus,
      ...(newStatus === JobStatus.DEVAM_EDIYOR
        ? {
            startedAt: job.startedAt ?? now,
            actualStartAt: job.actualStartAt ?? job.startedAt ?? now,
            holdReason: null,
            holdUntil: null,
          }
        : {}),
      ...(newStatus === JobStatus.BEKLEMEDE
        ? {
            holdReason: options.holdReason,
            holdUntil,
          }
        : {}),
      ...(newStatus === JobStatus.TAMAMLANDI
        ? {
            completedAt: now,
            actualEndAt: now,
          }
        : {}),
      ...(newStatus === JobStatus.KAPANDI
        ? {
            closedAt: now,
            closedById: actor.id,
          }
        : {}),
      ...(options.convertKesif
        ? {
            isKesif: false,
          }
        : {}),
    },
  });
}

export async function updateJobStatusAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const newStatusRaw = String(formData.get("newStatus") ?? "");
  const convertKesif = parseCheckbox(formData.get("convertKesif"));
  const nextPath = optionalString(formData.get("next"));

  const parsedStatus = jobStatusSchema.safeParse(newStatusRaw);

  if (!jobId || !parsedStatus.success) {
    redirect(`/jobs/${jobId || ""}?error=invalid-status`);
  }

  try {
    await updateJobStatus(jobId, parsedStatus.data, { convertKesif });
    revalidateAfterStatusChange(jobId);
    redirect(nextPath ?? `/jobs/${jobId}?updated=1`);
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "status-update";
    redirect(`/jobs/${jobId}?error=${message}`);
  }
}

export async function updateHoldDetails(
  jobId: string,
  reason: HoldReason,
  reminderDays: number
) {
  const safeReminderDays = Math.min(Math.max(reminderDays, 1), 14);

  return updateJobStatus(jobId, JobStatus.BEKLEMEDE, {
    holdReason: reason,
    reminderDays: safeReminderDays,
  });
}

export async function updateHoldDetailsAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const defaultReminderDays = await getOnHoldDefaultDays();
  const reminderDays = Number(formData.get("reminderDays") ?? defaultReminderDays);
  const reasonRaw = String(formData.get("reason") ?? "");
  const parsedReason = holdReasonSchema.safeParse(reasonRaw);

  if (!jobId || !parsedReason.success) {
    redirect(`/jobs/${jobId || ""}?error=invalid-hold`);
  }

  try {
    await updateHoldDetails(
      jobId,
      parsedReason.data,
      Number.isFinite(reminderDays) ? reminderDays : DEFAULT_ON_HOLD_DAYS
    );
    revalidateAfterHoldUpdate(jobId);
    redirect(`/jobs/${jobId}?updated=1`);
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "hold-update";
    redirect(`/jobs/${jobId}?error=${message}`);
  }
}

export async function cancelJob(jobId: string, cancelReason: string) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);

  const job = await prisma.serviceJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!job) {
    throw new Error("Is kaydi bulunamadi.");
  }

  if (!allowedTransitions[job.status].includes(JobStatus.IPTAL)) {
    throw new Error("Bu is durumu iptal edilemez.");
  }

  return prisma.serviceJob.update({
    where: { id: jobId },
    data: {
      status: JobStatus.IPTAL,
      cancelReason,
      closedAt: new Date(),
      closedById: actor.id,
      holdReason: null,
      holdUntil: null,
    },
  });
}

export async function cancelJobAction(formData: FormData) {
  const nextPath = optionalString(formData.get("next"));
  const parsed = cancelJobSchema.safeParse({
    jobId: formData.get("jobId"),
    cancelReason: formData.get("cancelReason"),
  });

  const jobId = String(formData.get("jobId") ?? "");

  if (!parsed.success) {
    redirect(`/jobs/${jobId}?error=cancel-reason-required`);
  }

  try {
    await cancelJob(parsed.data.jobId, parsed.data.cancelReason);
    revalidateAfterCancellation(parsed.data.jobId);
    redirect(nextPath ?? `/jobs/${parsed.data.jobId}?cancelled=1`);
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "cancel-job";
    redirect(`/jobs/${parsed.data.jobId}?error=${message}`);
  }
}
