import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";

import {
  buildEvaluationActionLinks,
  summarizeMissingEvaluations,
} from "@/lib/scoreboard";

describe("summarizeMissingEvaluations", () => {
  it("counts missing workshop and coordinator evaluations consistently", () => {
    const summary = summarizeMissingEvaluations([
      {
        workshopEvaluation: null,
        coordinatorEvaluation: null,
      },
      {
        workshopEvaluation: { normalizedScore: 88, notes: null, questions: [5, 4, 4] },
        coordinatorEvaluation: null,
      },
    ]);

    expect(summary).toEqual({
      missingWorkshopCount: 1,
      missingCoordinatorCount: 2,
    });
  });
});

describe("buildEvaluationActionLinks", () => {
  it("returns only workshop actions for workshop chief", () => {
    const actions = buildEvaluationActionLinks({
      role: Role.WORKSHOP_CHIEF,
      month: 3,
      year: 2026,
      missingWorkshopCount: 2,
      missingCoordinatorCount: 5,
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      key: "workshop",
      href: "/scoreboard?month=3&year=2026&openEval=workshop",
    });
  });

  it("returns both actions for admin when both forms are missing", () => {
    const actions = buildEvaluationActionLinks({
      role: Role.ADMIN,
      month: 3,
      year: 2026,
      missingWorkshopCount: 1,
      missingCoordinatorCount: 1,
    });

    expect(actions.map((action) => action.key)).toEqual(["workshop", "coordinator"]);
  });
});
