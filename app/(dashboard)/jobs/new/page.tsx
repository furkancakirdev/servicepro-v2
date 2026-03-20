import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";

import { getJobFormMeta } from "@/app/(dashboard)/jobs/actions";
import JobForm from "@/components/jobs/JobForm";
import { requireRoles } from "@/lib/auth";

const secondaryLinkClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-marine-ocean/20 bg-white px-5 text-sm font-medium text-marine-navy transition-colors hover:border-marine-ocean/40 hover:bg-marine-ocean/5";

export default async function NewJobPage() {
  await requireRoles([Role.ADMIN, Role.COORDINATOR]);
  const meta = await getJobFormMeta();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white px-5 py-5 shadow-panel sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-marine-ocean">
            Yeni Kayit
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-marine-navy">Yeni Is Olustur</h1>
        </div>
        <Link href="/jobs" className={secondaryLinkClass}>
          <ArrowLeft className="size-4" />
          Is listesine don
        </Link>
      </div>

      <JobForm meta={meta} />
    </div>
  );
}
