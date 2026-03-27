import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { submitFieldReportForActor } from "@/lib/field-report";
import { auth } from "@/lib/next-auth";

export const runtime = "nodejs";

const queuedFieldReportSchema = z.object({
  jobId: z.string().uuid(),
  report: z.object({
    unitInfo: z.string().trim().min(3),
    responsibleId: z.string().uuid(),
    supportIds: z.array(z.string().uuid()).default([]),
    partsUsed: z.string().trim().optional(),
    hasSubcontractor: z.boolean().default(false),
    subcontractorDetails: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    photos: z.object({
      before: z.string().trim().optional(),
      after: z.string().trim().optional(),
      details: z.array(z.string().trim()).default([]),
    }),
  }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.TECHNICIAN) {
    return NextResponse.json(
      { error: "Saha raporu senkronizasyonu yalnizca teknisyenler icindir." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = queuedFieldReportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Kuyruk verisi gecersiz." },
      { status: 400 }
    );
  }

  try {
    await submitFieldReportForActor(
      {
        id: session.user.id,
        role: session.user.role,
      },
      parsed.data.jobId,
      parsed.data.report
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kuyruktaki saha raporu gonderilemedi.",
      },
      { status: 409 }
    );
  }
}
