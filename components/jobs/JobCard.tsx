import Link from "next/link";
import { CalendarDays, MapPin, Users2 } from "lucide-react";
import { JobRole, JobStatus } from "@prisma/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import DifficultyBadge from "@/components/jobs/DifficultyBadge";
import StatusBadge from "@/components/jobs/StatusBadge";
import {
  getJobDateFieldLabel,
  getJobDateValue,
  type JobDateField,
} from "@/lib/jobs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ServiceJobListItem } from "@/types";

const actionLinkClass =
  "inline-flex h-10 items-center justify-center rounded-lg border border-marine-ocean/20 bg-white px-4 text-sm font-medium text-marine-navy transition-colors hover:border-marine-ocean/40 hover:bg-marine-ocean/5";
const primaryLinkClass =
  "inline-flex h-10 items-center justify-center rounded-lg bg-marine-navy px-4 text-sm font-medium text-white transition-colors hover:bg-marine-ocean";

function getTeamLabel(job: ServiceJobListItem) {
  const responsible =
    job.assignments.find((assignment) => assignment.role === JobRole.SORUMLU)?.user.name ??
    job.assignments[0]?.user.name ??
    "Atama bekleniyor";
  const supportCount = job.assignments.filter(
    (assignment) => assignment.role === JobRole.DESTEK
  ).length;

  return supportCount > 0 ? `${responsible} + ${supportCount} destek` : responsible;
}

function formatJobDate(date: Date) {
  return format(date, "dd MMM yyyy - HH:mm", { locale: tr });
}

export default function JobCard({
  job,
  dateField,
}: {
  job: ServiceJobListItem;
  dateField: JobDateField;
}) {
  const dateFieldLabel = getJobDateFieldLabel(dateField);

  return (
    <Card className="border-white/80 bg-white/95">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardDescription>{job.boat.name}</CardDescription>
            <CardTitle className="text-xl text-marine-navy">{job.category.name}</CardTitle>
            <p className="text-sm text-slate-600">{job.category.subScope}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={job.status} />
            <DifficultyBadge multiplier={job.multiplier} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <Users2 className="size-4 text-marine-ocean" />
            <span>{getTeamLabel(job)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <MapPin className="size-4 text-marine-ocean" />
            <span>{job.location ?? "Lokasyon bekleniyor"}</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <CalendarDays className="size-4 text-marine-ocean" />
            <span>
              {dateFieldLabel}: {formatJobDate(getJobDateValue(job, dateField))}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href={`/jobs/${job.id}`} className={primaryLinkClass}>
            Detay
          </Link>
          {job.status === JobStatus.TAMAMLANDI ? (
            <Link href={`/jobs/${job.id}?closeout=1`} className={actionLinkClass}>
              Kapat
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
