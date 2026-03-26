import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

export function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL;
  return Boolean(url) && !url?.includes("your_database_url");
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
