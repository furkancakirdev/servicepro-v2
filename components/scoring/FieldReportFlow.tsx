"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { submitFieldReportAction } from "@/app/(dashboard)/jobs/actions";
import FieldCompletionModal from "@/components/scoring/FieldCompletionModal";
import { Button } from "@/components/ui/button";
import {
  flushQueuedFieldReports,
  getQueuedFieldReportCount,
  upsertQueuedFieldReport,
} from "@/lib/field-report-queue";
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
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncingQueue, setSyncingQueue] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const resetDraftState = useCallback(() => {
    setOpen(false);
    setDraft({
      ...initialDraft,
      responsibleId: currentUserId,
    });
    setPhotos(initialPhotos);
  }, [currentUserId]);

  const clearLocalDraft = useCallback(() => {
    try {
      localStorage.removeItem(`field-report-draft-${jobId}`);
    } catch {
      // Ignore local storage cleanup failures.
    }
  }, [jobId]);

  const syncQueuedReports = useCallback(async (trigger: "mount" | "online" = "mount") => {
    if (typeof navigator === "undefined" || !navigator.onLine) {
      return;
    }

    setSyncingQueue(true);

    const result = await flushQueuedFieldReports();

    setQueuedCount(result.remaining.length);
    setSyncingQueue(false);

    if (result.synced.length > 0) {
      clearLocalDraft();
      toast.success(
        result.synced.length === 1
          ? "Bekleyen saha raporu gonderildi."
          : `${result.synced.length} bekleyen saha raporu gonderildi.`
      );
      router.refresh();
    }

    if (trigger === "online" && result.lastError) {
      toast.error(result.lastError);
    }
  }, [clearLocalDraft, router]);

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

    clearLocalDraft();
    resetDraftState();
    router.refresh();
  }, [actionState.success, clearLocalDraft, resetDraftState, router]);

  useEffect(() => {
    setQueuedCount(getQueuedFieldReportCount());

    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = () => {
      setIsOnline(true);
      void syncQueuedReports("online");
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) {
      void syncQueuedReports("mount");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [jobId, syncQueuedReports]);

  const canSubmit = useMemo(() => {
    const hasPhoto = Boolean(photos.before || photos.after || photos.details.length > 0);
    const hasUnitInfo = draft.unitInfo.trim().length >= 3;
    const hasSubcontractorDetails =
      !draft.hasSubcontractor || draft.subcontractorDetails.trim().length >= 3;
    const hasResponsible = draft.responsibleId.length > 0;

    return hasPhoto && hasUnitInfo && hasSubcontractorDetails && hasResponsible;
  }, [draft, photos]);

  async function handlePhotoUpload(file: File, type: "before" | "after" | "detail") {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Fotoğraf yüklemek için internet bağlantısı gerekiyor.");
      return;
    }

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

      toast.success("Fotoğraf yüklendi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fotoğraf yüklenemedi.");
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
        Saha Raporunu Gönder
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
          isOnline={isOnline}
          queuedCount={queuedCount}
          syncingQueue={syncingQueue}
          error={actionState.error}
          onChange={setDraft}
          onPhotoUpload={handlePhotoUpload}
          onClose={() => setOpen(false)}
          onSubmit={() => {
            if (!canSubmit) {
              return;
            }

            if (!isOnline) {
              upsertQueuedFieldReport(jobId, {
                unitInfo: draft.unitInfo,
                responsibleId: draft.responsibleId,
                supportIds: draft.supportIds,
                partsUsed: draft.partsUsed,
                hasSubcontractor: draft.hasSubcontractor,
                subcontractorDetails: draft.subcontractorDetails,
                notes: draft.notes,
                photos: {
                  before: photos.before,
                  after: photos.after,
                  details: photos.details,
                },
              });
              setQueuedCount(getQueuedFieldReportCount());
              clearLocalDraft();
              resetDraftState();
              toast.success(
                "İnternet yok, saha raporu cihaza alındı. Bağlantı gelince otomatik gönderilecek."
              );
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
