"use server";

import {
  initialSubmitFieldReportActionState,
  type SubmitFieldReportInput,
} from "@/lib/scoring";
import { requireAppUser } from "@/lib/auth";
import { submitFieldReportForActor } from "@/lib/field-report";

import {
  fieldReportSchema,
  optionalString,
  parseCheckbox,
  revalidateAfterFieldReport,
} from "./shared";

export async function submitFieldReport(jobId: string, report: SubmitFieldReportInput) {
  const actor = await requireAppUser();
  return submitFieldReportForActor(actor, jobId, report);
}

export async function submitFieldReportAction(
  _prevState: typeof initialSubmitFieldReportActionState,
  formData: FormData
): Promise<typeof initialSubmitFieldReportActionState> {
  const detailPhotoUrlsRaw = String(formData.get("detailPhotoUrls") ?? "[]");

  let detailPhotoUrls: string[] = [];
  try {
    const parsedPhotoUrls = JSON.parse(detailPhotoUrlsRaw) as unknown;
    detailPhotoUrls = Array.isArray(parsedPhotoUrls)
      ? parsedPhotoUrls.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    detailPhotoUrls = [];
  }

  const parsed = fieldReportSchema.safeParse({
    jobId: formData.get("jobId"),
    unitInfo: formData.get("unitInfo"),
    responsibleId: formData.get("responsibleId"),
    supportIds: formData.getAll("supportIds").map(String),
    partsUsed: optionalString(formData.get("partsUsed")),
    hasSubcontractor: parseCheckbox(formData.get("hasSubcontractor")),
    subcontractorDetails: optionalString(formData.get("subcontractorDetails")),
    notes: optionalString(formData.get("notes")),
    beforePhotoUrl: optionalString(formData.get("beforePhotoUrl")),
    afterPhotoUrl: optionalString(formData.get("afterPhotoUrl")),
    detailPhotoUrls,
  });

  if (!parsed.success) {
    return {
      ...initialSubmitFieldReportActionState,
      error: parsed.error.issues[0]?.message ?? "Saha raporu eksik veya gecersiz.",
    };
  }

  try {
    await submitFieldReport(parsed.data.jobId, {
      unitInfo: parsed.data.unitInfo,
      responsibleId: parsed.data.responsibleId,
      supportIds: parsed.data.supportIds,
      partsUsed: parsed.data.partsUsed,
      hasSubcontractor: parsed.data.hasSubcontractor,
      subcontractorDetails: parsed.data.subcontractorDetails,
      notes: parsed.data.notes,
      photos: {
        before: parsed.data.beforePhotoUrl,
        after: parsed.data.afterPhotoUrl,
        details: parsed.data.detailPhotoUrls,
      },
    });

    revalidateAfterFieldReport(parsed.data.jobId);

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      ...initialSubmitFieldReportActionState,
      error:
        error instanceof Error
          ? error.message
          : "Saha raporu gonderilirken beklenmeyen bir hata olustu.",
    };
  }
}
