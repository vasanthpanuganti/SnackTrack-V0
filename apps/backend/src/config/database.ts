import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

const isDevelopment = env.NODE_ENV !== "production";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
};

const prismaPool =
  globalForPrisma.prismaPool ?? new Pool({ connectionString: env.DATABASE_URL });

const adapter = new PrismaPg(prismaPool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: isDevelopment
      ? [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "warn" },
          { emit: "stdout", level: "error" },
        ]
      : [{ emit: "stdout", level: "error" }],
  });

if (isDevelopment) {
  prisma.$on("query" as never, (e: { query: string; duration: number }) => {
    logger.debug({ query: e.query, duration: `${e.duration}ms` }, "Prisma query");
  });

  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = prismaPool;
}

export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
