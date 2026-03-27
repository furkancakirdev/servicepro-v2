"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { evaluateAndCloseJobAction } from "@/app/(dashboard)/jobs/actions";
import CoordinatorEvaluationModal from "@/components/scoring/CoordinatorEvaluationModal";
import ScoreResult from "@/components/scoring/ScoreResult";
import { Button } from "@/components/ui/button";
import {
  initialEvaluateAndCloseJobActionState,
  type FieldReportInput,
} from "@/lib/scoring";
import { useActionStateCompat } from "@/lib/use-action-state-compat";

type CoordinatorEvaluationFlowProps = {
  jobId: string;
  multiplier: number;
  report: FieldReportInput;
};

type EvaluationDraft = {
  q1_unit: number | null;
  q2_photos: number | null;
  q3_parts: number | null;
  q4_sub: number | null;
  q5_notify: number | null;
};

const initialEvaluationDraft: EvaluationDraft = {
  q1_unit: null,
  q2_photos: null,
  q3_parts: null,
  q4_sub: null,
  q5_notify: null,
};

export default function CoordinatorEvaluationFlow({
  jobId,
  multiplier,
  report,
}: CoordinatorEvaluationFlowProps) {
  const router = useRouter();
  const [actionState, formAction] = useActionStateCompat(
    evaluateAndCloseJobAction,
    initialEvaluateAndCloseJobActionState
  );
  const [open, setOpen] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationDraft>(initialEvaluationDraft);

  useEffect(() => {
    if (!actionState.success || !actionState.result) {
      return;
    }

    setOpen(false);
    router.refresh();
  }, [actionState.result, actionState.success, router]);

  const normalizedEvaluation = useMemo(
    () => ({
      ...evaluation,
      q4_sub: report.hasSubcontractor ? evaluation.q4_sub : 5,
    }),
    [evaluation, report.hasSubcontractor]
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
      <Button
        type="button"
        size="lg"
        className="h-12 w-full bg-marine-navy text-white hover:bg-marine-ocean"
        onClick={() => setOpen(true)}
      >
        Form-1 Degerlendirmesini Tamamla
      </Button>

      <form action={formAction}>
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="q1_unit" value={normalizedEvaluation.q1_unit ?? ""} />
        <input type="hidden" name="q2_photos" value={normalizedEvaluation.q2_photos ?? ""} />
        <input type="hidden" name="q3_parts" value={normalizedEvaluation.q3_parts ?? ""} />
        <input type="hidden" name="q4_sub" value={normalizedEvaluation.q4_sub ?? ""} />
        <input type="hidden" name="q5_notify" value={normalizedEvaluation.q5_notify ?? ""} />

        <CoordinatorEvaluationModal
          open={open}
          multiplier={multiplier}
          report={report}
          value={normalizedEvaluation}
          canSubmit={canSubmit}
          error={actionState.error}
          onClose={() => setOpen(false)}
          onChange={setEvaluation}
        />
      </form>

      {actionState.success && actionState.result ? <ScoreResult result={actionState.result} /> : null}
    </>
  );
}
