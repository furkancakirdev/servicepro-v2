"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { submitFieldReportAction } from "@/app/(dashboard)/jobs/actions";
import FieldCompletionModal from "@/components/scoring/FieldCompletionModal";
import { Button } from "@/components/ui/button";
import { initialSubmitFieldReportActionState } from "@/lib/scoring";
import { uploadJobPhoto } from "@/lib/storage";
import { useActionStateCompat } from "@/lib/use-action-state-compat";

type FieldReportFlowProps = {
  jobId: string;
  boatName: string;
  categoryName: string;
  currentUserId: string;
  technicians: Array<{
    id: string;
    name: string;
  }>;
};

type FieldReportDraft = {
  unitInfo: string;
  responsibleId: string;
  supportIds: string[];
  partsUsed: string;
  hasSubcontractor: boolean;
  subcontractorDetails: string;
  notes: string;
};

type FieldReportPhotos = {
  before?: string;
  after?: string;
  details: string[];
};

const initialDraft: FieldReportDraft = {
  unitInfo: "",
  responsibleId: "",
  supportIds: [],
  partsUsed: "",
  hasSubcontractor: false,
  subcontractorDetails: "",
  notes: "",
};

const initialPhotos: FieldReportPhotos = {
  details: [],
};

export default function FieldReportFlow({
  jobId,
  boatName,
  categoryName,
  currentUserId,
  technicians,
}: FieldReportFlowProps) {
  const router = useRouter();
  const [actionState, formAction] = useActionStateCompat(
    submitFieldReportAction,
    initialSubmitFieldReportActionState
  );
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FieldReportDraft>(initialDraft);
  const [photos, setPhotos] = useState<FieldReportPhotos>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    try {
      const savedDraft = localStorage.getItem(`field-report-draft-${jobId}`);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as {
          draft: FieldReportDraft;
          photos: FieldReportPhotos;
        };
        setDraft({
          ...initialDraft,
          ...parsed.draft,
          responsibleId: parsed.draft?.responsibleId ?? currentUserId,
          supportIds: parsed.draft?.supportIds ?? [],
        });
        setPhotos(parsed.photos ?? initialPhotos);
        return;
      }
    } catch {
      // Ignore local draft failures.
    }

    setDraft((current) => ({
      ...current,
      responsibleId: current.responsibleId || currentUserId,
    }));
  }, [currentUserId, jobId]);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    try {
      localStorage.setItem(
        `field-report-draft-${jobId}`,
        JSON.stringify({
          draft,
          photos,
        })
      );
    } catch {
      // Ignore local draft failures.
    }
  }, [draft, jobId, photos]);

  useEffect(() => {
    if (!actionState.success) {
      return;
    }

    try {
      localStorage.removeItem(`field-report-draft-${jobId}`);
    } catch {
      // Ignore local storage cleanup failures.
    }

    setOpen(false);
    setDraft({
      ...initialDraft,
      responsibleId: currentUserId,
    });
    setPhotos(initialPhotos);
    router.refresh();
  }, [actionState.success, currentUserId, jobId, router]);

  const canSubmit = useMemo(() => {
    const hasPhoto = Boolean(photos.before || photos.after || photos.details.length > 0);
    const hasUnitInfo = draft.unitInfo.trim().length >= 3;
    const hasSubcontractorDetails =
      !draft.hasSubcontractor || draft.subcontractorDetails.trim().length >= 3;
    const hasResponsible = draft.responsibleId.length > 0;

    return hasPhoto && hasUnitInfo && hasSubcontractorDetails && hasResponsible;
  }, [draft, photos]);

  async function handlePhotoUpload(file: File, type: "before" | "after" | "detail") {
    setUploading(true);

    try {
      const url = await uploadJobPhoto(jobId, file, type);

      if (type === "before") {
        setPhotos((current) => ({ ...current, before: url }));
      } else if (type === "after") {
        setPhotos((current) => ({ ...current, after: url }));
      } else {
        setPhotos((current) => ({
          ...current,
          details: [...current.details, url],
        }));
      }

      toast.success("Fotograf yuklendi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fotograf yuklenemedi.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        className="h-12 w-full bg-marine-navy text-white hover:bg-marine-ocean"
        onClick={() => setOpen(true)}
      >
        Saha Raporunu Gonder
      </Button>

      <form ref={formRef} action={formAction}>
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="unitInfo" value={draft.unitInfo} />
        <input type="hidden" name="responsibleId" value={draft.responsibleId} />
        <input type="hidden" name="partsUsed" value={draft.partsUsed} />
        <input
          type="hidden"
          name="hasSubcontractor"
          value={draft.hasSubcontractor ? "true" : "false"}
        />
        <input type="hidden" name="subcontractorDetails" value={draft.subcontractorDetails} />
        <input type="hidden" name="notes" value={draft.notes} />
        <input type="hidden" name="beforePhotoUrl" value={photos.before ?? ""} />
        <input type="hidden" name="afterPhotoUrl" value={photos.after ?? ""} />
        <input type="hidden" name="detailPhotoUrls" value={JSON.stringify(photos.details)} />
        {draft.supportIds.map((supportId) => (
          <input key={supportId} type="hidden" name="supportIds" value={supportId} />
        ))}

        <FieldCompletionModal
          open={open}
          boatName={boatName}
          categoryName={categoryName}
          value={draft}
          photos={photos}
          technicians={technicians}
          uploading={uploading}
          error={actionState.error}
          onChange={setDraft}
          onPhotoUpload={handlePhotoUpload}
          onClose={() => setOpen(false)}
          onSubmit={() => {
            if (!canSubmit) {
              return;
            }
            formRef.current?.requestSubmit();
          }}
          canSubmit={canSubmit}
        />
      </form>
    </>
  );
}
