import "server-only";

import { JobStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getBoatDirectory() {
  return prisma.boat.findMany({
    include: {
      contacts: true,
      jobs: {
        where: {
          status: {
            in: [JobStatus.TAMAMLANDI, JobStatus.KAPANDI, JobStatus.GARANTI],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          createdAt: true,
        },
      },
      _count: {
        select: {
          jobs: true,
          contacts: true,
        },
      },
    },
    orderBy: [
      {
        isVip: "desc",
      },
      {
        name: "asc",
      },
    ],
  });
}

export async function getBoatDetail(id: string) {
  return prisma.boat.findUnique({
    where: {
      id,
    },
    include: {
      contacts: {
        orderBy: [
          {
            isPrimary: "desc",
          },
          {
            name: "asc",
          },
        ],
      },
      jobs: {
        include: {
          category: true,
          assignments: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
    },
  });
}
