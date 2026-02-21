import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma before importing the module
vi.mock("@prisma/client", () => {
  const mockPrisma = {
    $queryRaw: vi.fn(),
    $on: vi.fn(),
  };
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

// Mock env
vi.mock("../src/config/env.js", () => ({
  env: { NODE_ENV: "test" },
}));

// Mock logger
vi.mock("../src/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { isDatabaseHealthy, prisma } from "../src/config/database.js";

describe("isDatabaseHealthy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when database responds to SELECT 1", async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ "?column?": 1 }]);

    const result = await isDatabaseHealthy();

    expect(result).toBe(true);
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it("returns false when database query throws", async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Connection refused"),
    );

    const result = await isDatabaseHealthy();

    expect(result).toBe(false);
  });
});
