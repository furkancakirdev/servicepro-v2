"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { JobStatus, Role } from "@prisma/client";

import {
  normalizeJobPriority,
  normalizeJobSchedule,
  toEstimatedDateSeconds,
  type CreateJobFormState,
} from "@/lib/jobs";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  CreateJobInput,
  createJobActionSchema,
  optionalString,
  parseCheckbox,
  revalidateAfterJobCreate,
} from "./shared";

export async function createJob(data: CreateJobInput) {
  const actor = await requireRoles([Role.ADMIN, Role.COORDINATOR]);
  const schedule = normalizeJobSchedule({
    plannedStartDate: data.plannedStartDate,
    estimatedDate: data.estimatedDate,
  });

  const category = await prisma.serviceCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new Error("SeÃ§ilen kategori bulunamadÄ±.");
  }

  const boat = await prisma.boat.findFirst({
    where: {
      id: data.boatId,
      isActive: true,
    },
  });

  if (!boat) {
    throw new Error("Secilen tekne bulunamadi.");
  }
  /*



    throw new Error("Destek ekibindeki kullanÄ±cÄ±lardan biri bulunamadÄ±.");
  }

  */
  const status = data.isKesif ? JobStatus.KESIF : JobStatus.PLANLANDI;
  const dispatchDate = new Date(schedule.plannedStartAt.getTime());
  dispatchDate.setHours(0, 0, 0, 0);

  return prisma.$transaction(async (tx) => {
    const job = await tx.serviceJob.create({
      data: {
        boatId: boat.id,
        categoryId: category.id,
        description: data.description,
        multiplier: category.multiplier,
        status,
        isWarranty: data.isWarranty,
        isKesif: data.isKesif,
        createdById: actor.id,
        location: data.location,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        notes: data.notes,
        dispatchDate,
        plannedStartDate: schedule.plannedStartAt,
        estimatedDate: toEstimatedDateSeconds(schedule.plannedEndAt),
        priority: normalizeJobPriority(data.priority),
        plannedStartAt: schedule.plannedStartAt,
        plannedEndAt: schedule.plannedEndAt,
        slaHours: schedule.slaHours,
      },
    });

    return job;
  });
}

export async function createJobAction(
  _prevState: CreateJobFormState,
  formData: FormData
): Promise<CreateJobFormState> {
  const parsed = createJobActionSchema.safeParse({
    boatId: formData.get("boatId"),
    location: optionalString(formData.get("location")),
    contactName: optionalString(formData.get("contactName")),
    contactPhone: optionalString(formData.get("contactPhone")),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    isWarranty: parseCheckbox(formData.get("isWarranty")),
    isKesif: parseCheckbox(formData.get("isKesif")),
    notes: optionalString(formData.get("notes")),
    plannedStartDate: formData.get("plannedStartDate"),
    estimatedDate: formData.get("estimatedDate"),
    priority: formData.get("priority"),
    nextPath: optionalString(formData.get("nextPath")),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;

    return {
      error: "LÃ¼tfen zorunlu alanlarÄ± kontrol edin.",
      fieldErrors: {
        boatId: flattened.boatId?.[0],
        categoryId: flattened.categoryId?.[0],
        description: flattened.description?.[0],
        plannedStartDate: flattened.plannedStartDate?.[0],
        estimatedDate: flattened.estimatedDate?.[0],
        priority: flattened.priority?.[0],
      },
    };
  }

  try {
    const job = await createJob(parsed.data);
    revalidateAfterJobCreate();
    redirect(`/jobs/${job.id}?created=1`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      error:
        error instanceof Error
          ? error.message
          : "Ä°ÅŸ oluÅŸturulurken beklenmeyen bir hata oluÅŸtu.",
      fieldErrors: {},
    };
  }
}
