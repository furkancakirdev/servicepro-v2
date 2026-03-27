import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JobRole, JobStatus, Role } from "@prisma/client";
import { notFound } from "next/navigation";

import {
  getJobById,
  getJobFilterOptions,
} from "@/app/(dashboard)/jobs/actions";
import DifficultyBadge from "@/components/jobs/DifficultyBadge";
import JobDetailAlerts from "@/components/jobs/detail/JobDetailAlerts";
import JobDetailMainColumn from "@/components/jobs/detail/JobDetailMainColumn";
import JobDetailSidebar from "@/components/jobs/detail/JobDetailSidebar";
import {
  buildJobTimeline,
  isWithinObjectionWindow,
  secondaryLinkClass,
  takeFirstValue,
} from "@/components/jobs/detail/shared";
import StatusBadge from "@/components/jobs/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { requireAppUser } from "@/lib/auth";
import {
  buildClientNotificationTemplate,
  buildWhatsAppDeepLink,
} from "@/lib/client-notifications";
import { parseFieldReport, type FieldReportInput } from "@/lib/scoring";
import { getOnHoldDefaultDays } from "@/lib/system-settings";

type JobDetailPageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function JobDetailPage({
  params,
  searchParams,
}: JobDetailPageProps) {
  const currentUser = await requireAppUser();
  const [data, onHoldDefaultDays, technicians] = await Promise.all([
    getJobById(params.id),
    getOnHoldDefaultDays(),
    getJobFilterOptions(),
  ]);

  if (!data) {
    notFound();
  }

  const { job, sameBoatOpenJobs, recentBoatHistory } = data;
  const responsible =
    job.assignments.find((assignment) => assignment.role === JobRole.SORUMLU)?.user ??
    job.assignments[0]?.user ??
    null;
  const supportAssignments = job.assignments.filter(
    (assignment) => assignment.role === JobRole.DESTEK
  );
  const created = takeFirstValue(searchParams?.created) === "1";
  const updated = takeFirstValue(searchParams?.updated) === "1";
  const objectionSubmitted = takeFirstValue(searchParams?.objection) === "1";
  const statusMessage = takeFirstValue(searchParams?.error);
  const canManageJob =
    currentUser.role === Role.ADMIN || currentUser.role === Role.COORDINATOR;
  const canSubmitFieldReport =
    currentUser.role === Role.TECHNICIAN &&
    job.status === JobStatus.DEVAM_EDIYOR &&
    !job.deliveryReport;
  const canEvaluateAndClose =
    canManageJob &&
    job.status === JobStatus.TAMAMLANDI &&
    Boolean(job.deliveryReport) &&
    !job.evaluation &&
    job.jobScores.length === 0;
  const canSendClientNotification = canManageJob && job.boat.contacts.length > 0;
  const primaryContact =
    job.boat.contacts.find(
      (contact) => contact.isPrimary && contact.whatsappOptIn && contact.phone
    ) ??
    job.boat.contacts.find((contact) => contact.whatsappOptIn && contact.phone) ??
    null;
  const primaryContactTemplate = primaryContact
    ? buildClientNotificationTemplate({
        boatName: job.boat.name,
        categoryName: job.category.name,
        date: job.actualStartAt ?? job.startedAt ?? job.plannedStartAt ?? job.createdAt,
        location: job.location,
        berthDetail: job.location,
        technicianName: responsible?.name ?? "Teknisyen",
        contactName: primaryContact.name,
        contactLanguage: primaryContact.language,
      })
    : null;
  const primaryContactWhatsAppUrl =
    primaryContact?.phone && primaryContactTemplate
      ? buildWhatsAppDeepLink(primaryContact.phone, primaryContactTemplate.text)
      : null;
  const parsedReport = parseFieldReport(job.deliveryReport?.notes);
  const fieldReport: FieldReportInput | null = job.deliveryReport
    ? {
        unitInfo: job.deliveryReport.unitInfo ?? parsedReport?.unitInfo ?? "",
        partsUsed: job.deliveryReport.partsUsed ?? parsedReport?.partsUsed ?? "",
        hasSubcontractor: job.deliveryReport.hasSubcontractor,
        subcontractorDetails:
          job.deliveryReport.subcontractorDetails ?? parsedReport?.subcontractorDetails ?? "",
        notes: parsedReport?.notes ?? "",
        photos: {
          before: job.deliveryReport.beforePhotoUrl ?? parsedReport?.photos.before,
          after: job.deliveryReport.afterPhotoUrl ?? parsedReport?.photos.after,
          details:
            (Array.isArray(job.deliveryReport.detailPhotoUrls)
              ? job.deliveryReport.detailPhotoUrls
              : null)?.filter((item): item is string => typeof item === "string") ??
            parsedReport?.photos.details ??
            [],
        },
      }
    : null;
  const responsibleScore =
    job.jobScores.find((score) => score.role === JobRole.SORUMLU) ??
    job.jobScores[0] ??
    null;
  const supportScores = job.jobScores.filter((score) => score.role === JobRole.DESTEK);
  const canObjectToScore =
    job.jobScores.length > 0 &&
    isWithinObjectionWindow(job.closedAt) &&
    currentUser.role !== Role.ADMIN;
  const timeline = buildJobTimeline(job);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/jobs" className={secondaryLinkClass}>
          <ArrowLeft className="size-4" />
          Geri
        </Link>
        <StatusBadge status={job.status} priority={job.priority} />
        <DifficultyBadge multiplier={job.multiplier} />
        {job.boat.isVip ? (
          <Badge variant="outline" className="border-[#BA7517] text-[#BA7517]">
            VIP Müşteri
          </Badge>
        ) : null}
      </div>

      <JobDetailAlerts
        created={created}
        updated={updated}
        objectionSubmitted={objectionSubmitted}
        statusMessage={statusMessage}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.9fr)]">
        <JobDetailMainColumn
          job={job}
          responsible={responsible}
          supportAssignments={supportAssignments}
          sameBoatOpenJobs={sameBoatOpenJobs}
          recentBoatHistory={recentBoatHistory}
          fieldReport={fieldReport}
          timeline={timeline}
        />

        <JobDetailSidebar
          job={job}
          responsible={responsible}
          canManageJob={canManageJob}
           canSubmitFieldReport={canSubmitFieldReport}
           canEvaluateAndClose={canEvaluateAndClose}
           canObjectToScore={canObjectToScore}
           canSendClientNotification={canSendClientNotification}
            fieldReport={fieldReport}
            currentUserId={currentUser.id}
            technicians={technicians}
            onHoldDefaultDays={onHoldDefaultDays}
            primaryContactWhatsAppUrl={primaryContactWhatsAppUrl}
            responsibleScore={responsibleScore}
          supportScores={supportScores}
        />
      </div>
    </div>
  );
}
