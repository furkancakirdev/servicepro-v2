import "server-only";

import { subDays } from "date-fns";
import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type TechnicianContinuitySuggestion = {
  userId: string;
  name: string;
  visitCount: number;
  lastVisitedAt: string | null;
  label: string;
};

function buildSuggestionLabel(name: string, visitCount: number) {
  return `${name} - bu tekneye ${visitCount} kez gitti`;
}

function sortSuggestions(
  left: TechnicianContinuitySuggestion,
  right: TechnicianContinuitySuggestion
) {
  return (
    right.visitCount - left.visitCount ||
    left.name.localeCompare(right.name, "tr")
  );
}

export async function getTechnicianSuggestion(
  boatId: string,
  prismaClient: PrismaClient = prisma
): Promise<TechnicianContinuitySuggestion[]> {
  const suggestionMap = await getTechnicianSuggestionsForBoats([boatId], prismaClient);

  return suggestionMap[boatId] ?? [];
}

export async function getTechnicianSuggestionsForBoats(
  boatIds: string[],
  prismaClient: PrismaClient = prisma
): Promise<Record<string, TechnicianContinuitySuggestion[]>> {
  if (boatIds.length === 0) {
    return {};
  }

  const since = subDays(new Date(), 90);
  const assignments = await prismaClient.jobAssignment.findMany({
    where: {
      job: {
        boatId: {
          in: boatIds,
        },
        createdAt: {
          gte: since,
        },
      },
    },
    select: {
      userId: true,
      createdAt: true,
      user: {
        select: {
          name: true,
        },
      },
      job: {
        select: {
          boatId: true,
        },
      },
    },
  });

  const grouped = new Map<
    string,
    Map<string, TechnicianContinuitySuggestion>
  >();

  for (const assignment of assignments) {
    const boatGroup = grouped.get(assignment.job.boatId) ?? new Map();
    const current = boatGroup.get(assignment.userId);
    const lastVisitedAt = assignment.createdAt.toISOString();

    if (!current) {
      boatGroup.set(assignment.userId, {
        userId: assignment.userId,
        name: assignment.user.name,
        visitCount: 1,
        lastVisitedAt,
        label: buildSuggestionLabel(assignment.user.name, 1),
      });
      grouped.set(assignment.job.boatId, boatGroup);
      continue;
    }

    const visitCount = current.visitCount + 1;
    boatGroup.set(assignment.userId, {
      ...current,
      visitCount,
      lastVisitedAt:
        current.lastVisitedAt && current.lastVisitedAt > lastVisitedAt
          ? current.lastVisitedAt
          : lastVisitedAt,
      label: buildSuggestionLabel(current.name, visitCount),
    });
  }

  return Object.fromEntries(
    Array.from(grouped.entries()).map(([boatId, suggestions]) => [
      boatId,
      Array.from(suggestions.values()).sort(sortSuggestions),
    ])
  );
}
