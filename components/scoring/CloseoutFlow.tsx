"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";

import { closeJobWithEvaluationAction } from "@/app/(dashboard)/jobs/actions";
import DeliveryReportModal from "@/components/scoring/DeliveryReportModal";
import ScoreResult from "@/components/scoring/ScoreResult";
import ScoringModal from "@/components/scoring/ScoringModal";
import { Button } from "@/components/ui/button";
import {
  initialCloseJobWithEvaluationActionState,
  type CloseJobWithEvaluationActionState,
} from "@/lib/scoring";

type CloseoutFlowProps = {
  jobId: string;
  boatName: string;
  categoryName: string;
  multiplier: number;
  startOpen?: boolean;
};

type DeliveryDraft = {
  unitInfoScore: number | null;
  photosScore: number | null;
  partsListScore: number | null;
  hasSubcontractor: boolean | null;
  subcontractorScore: number | null;
  clientNotifyScore: number | null;
  notes: string;
};

type EvaluationDraft = {
  q1_unit: number | null;
  q2_photos: number | null;
  q3_parts: number | null;
  q4_sub: number | null;
  q5_notify: number | null;
};

type FlowStep = "idle" | "delivery" | "scoring" | "result";

const initialDeliveryDraft: DeliveryDraft = {
  unitInfoScore: null,
  photosScore: null,
  partsListScore: null,
  hasSubcontractor: null,
  subcontractorScore: null,
  clientNotifyScore: null,
  notes: "",
};

const initialEvaluationDraft: EvaluationDraft = {
  q1_unit: null,
  q2_photos: null,
  q3_parts: null,
  q4_sub: null,
  q5_notify: null,
};

const triggerButtonClass =
  "h-12 w-full bg-marine-navy text-white hover:bg-marine-ocean";

export default function CloseoutFlow({
  jobId,
  boatName,
  categoryName,
  multiplier,
  startOpen = false,
}: CloseoutFlowProps) {
  const router = useRouter();
  const [actionState, formAction] = useFormState<
    CloseJobWithEvaluationActionState,
    FormData
  >(closeJobWithEvaluationAction, initialCloseJobWithEvaluationActionState);
  const [step, setStep] = useState<FlowStep>(startOpen ? "delivery" : "idle");
  const [delivery, setDelivery] = useState<DeliveryDraft>(initialDeliveryDraft);
  const [evaluation, setEvaluation] = useState<EvaluationDraft>(initialEvaluationDraft);

  useEffect(() => {
    if (startOpen) {
      setStep("delivery");
    }
  }, [startOpen]);

  useEffect(() => {
    if (!actionState.success || !actionState.result) {
      return;
    }

    setStep("result");
    router.refresh();
  }, [actionState.result, actionState.success, router]);

  const canStartScoring = useMemo(() => {
    const answeredDeliveryFields = [
      delivery.unitInfoScore,
      delivery.photosScore,
      delivery.partsListScore,
      delivery.hasSubcontractor === null
        ? null
        : delivery.hasSubcontractor
          ? delivery.subcontractorScore
          : 5,
      delivery.clientNotifyScore,
    ].filter(Boolean).length;

    return answeredDeliveryFields === 5;
  }, [delivery]);

  const normalizedEvaluation = useMemo(
    () => ({
      ...evaluation,
      q4_sub: delivery.hasSubcontractor ? evaluation.q4_sub : 5,
    }),
    [delivery.hasSubcontractor, evaluation]
  );

  const canSubmit = [
    normalizedEvaluation.q1_unit,
    normalizedEvaluation.q2_photos,
    normalizedEvaluation.q3_parts,
    normalizedEvaluation.q4_sub,
    normalizedEvaluation.q5_notify,
  ].every(Boolean);

  return (
    <>
      {step === "idle" ? (
        <Button
          type="button"
          size="lg"
          className={triggerButtonClass}
          onClick={() => setStep("delivery")}
        >
          Kapat ve Puanla
        </Button>
      ) : null}

      <DeliveryReportModal
        open={step === "delivery"}
        boatName={boatName}
        categoryName={categoryName}
        value={delivery}
        onChange={setDelivery}
        onContinue={() => {
          if (!canStartScoring) {
            return;
          }

          if (delivery.hasSubcontractor === false) {
            setEvaluation((current) => ({ ...current, q4_sub: 5 }));
          }

          setStep("scoring");
        }}
      />

      {step === "scoring" ? (
        <form action={formAction}>
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="unitInfoScore" value={delivery.unitInfoScore ?? ""} />
          <input type="hidden" name="photosScore" value={delivery.photosScore ?? ""} />
          <input type="hidden" name="partsListScore" value={delivery.partsListScore ?? ""} />
          <input
            type="hidden"
            name="hasSubcontractor"
            value={delivery.hasSubcontractor ? "true" : "false"}
          />
          <input
            type="hidden"
            name="subcontractorScore"
            value={
              delivery.hasSubcontractor
                ? normalizedEvaluation.q4_sub ?? delivery.subcontractorScore ?? ""
                : 5
            }
          />
          <input
            type="hidden"
            name="clientNotifyScore"
            value={delivery.clientNotifyScore ?? ""}
          />
          <input type="hidden" name="deliveryNotes" value={delivery.notes} />
          <input type="hidden" name="q1_unit" value={normalizedEvaluation.q1_unit ?? ""} />
          <input type="hidden" name="q2_photos" value={normalizedEvaluation.q2_photos ?? ""} />
          <input type="hidden" name="q3_parts" value={normalizedEvaluation.q3_parts ?? ""} />
          <input type="hidden" name="q4_sub" value={normalizedEvaluation.q4_sub ?? ""} />
          <input type="hidden" name="q5_notify" value={normalizedEvaluation.q5_notify ?? ""} />

          <ScoringModal
            open
            multiplier={multiplier}
            value={normalizedEvaluation}
            hasSubcontractor={Boolean(delivery.hasSubcontractor)}
            canSubmit={canSubmit}
            error={actionState.error}
            onBack={() => setStep("delivery")}
            onChange={setEvaluation}
          />
        </form>
      ) : null}

      {step === "result" && actionState.result ? (
        <ScoreResult result={actionState.result} />
      ) : null}
    </>
  );
}
