import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: "forks",
    // Integration files share one database and truncate tables in their
    // setup/teardown hooks — parallel files race and flake. Run serially.
    fileParallelism: false,
    globalSetup: ["tests/integration/setup.ts"],
  },
});
