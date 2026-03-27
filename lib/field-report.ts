import { JobRole, JobStatus, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { serializeFieldReport, type SubmitFieldReportInput } from "@/lib/scoring";

type FieldReportActor = {
  id: string;
  role: Role;
};

export async function submitFieldReportForActor(
  actor: FieldReportActor,
  jobId: string,
  report: SubmitFieldReportInput
) {
  const completedAt = new Date();
  const supportIds = Array.from(new Set(report.supportIds)).filter(
    (supportId) => supportId !== report.responsibleId
  );

  return prisma.$transaction(async (tx) => {
    const job = await tx.serviceJob.findUnique({
      where: { id: jobId },
      include: {
        assignments: true,
        deliveryReport: true,
      },
    });

    if (!job) {
      throw new Error("Is kaydi bulunamadi.");
    }

    if (actor.role !== Role.TECHNICIAN) {
      throw new Error("Saha raporu yalnizca teknisyen tarafindan gonderilebilir.");
    }

    if (job.status !== JobStatus.DEVAM_EDIYOR) {
      throw new Error("Saha raporu yalnizca devam eden islerde gonderilebilir.");
    }

    if (job.deliveryReport) {
      throw new Error("Bu is icin saha raporu zaten gonderilmis.");
    }

    const declaredTeamIds = [report.responsibleId, ...supportIds];

    if (!declaredTeamIds.includes(actor.id)) {
      throw new Error("Raporu gonderen teknisyen ekip listesinde yer almalidir.");
    }

    const technicians = await tx.user.findMany({
      where: {
        id: {
          in: declaredTeamIds,
        },
        role: Role.TECHNICIAN,
      },
      select: {
        id: true,
      },
    });
    const technicianIds = new Set(technicians.map((technician) => technician.id));

    if (!technicianIds.has(report.responsibleId)) {
      throw new Error("Secilen sorumlu teknisyen bulunamadi.");
    }

    if (supportIds.some((supportId) => !technicianIds.has(supportId))) {
      throw new Error("Destek ekibindeki teknisyenlerden biri bulunamadi.");
    }

    await tx.jobAssignment.deleteMany({
      where: {
        jobId: job.id,
      },
    });

    await tx.jobAssignment.createMany({
      data: [
        {
          jobId: job.id,
          userId: report.responsibleId,
          role: JobRole.SORUMLU,
        },
        ...supportIds.map((supportId) => ({
          jobId: job.id,
          userId: supportId,
          role: JobRole.DESTEK,
        })),
      ],
    });

    const deliveryReport = await tx.deliveryReport.create({
      data: {
        jobId: job.id,
        unitInfo: report.unitInfo,
        partsUsed: report.partsUsed?.trim() || null,
        subcontractorDetails: report.hasSubcontractor
          ? report.subcontractorDetails?.trim() || null
          : null,
        beforePhotoUrl: report.photos.before || null,
        afterPhotoUrl: report.photos.after || null,
        detailPhotoUrls: report.photos.details,
        unitInfoScore: 5,
        photosScore: 5,
        partsListScore: 5,
        subcontractorScore: 5,
        hasSubcontractor: report.hasSubcontractor,
        clientNotifyScore: 5,
        notes: serializeFieldReport(report),
      },
    });

    const updatedJob = await tx.serviceJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.TAMAMLANDI,
        completedAt,
        actualEndAt: completedAt,
      },
    });

    return {
      deliveryReport,
      job: updatedJob,
    };
  });
}
