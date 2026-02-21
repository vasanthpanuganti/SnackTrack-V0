import { execSync } from "child_process";

export async function setup() {
  console.log("Running Prisma migrations for integration tests...");
  execSync("npx prisma db push --force-reset", {
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://snacktrack:snacktrack_dev@localhost:5432/snacktrack_test",
      DIRECT_URL:
        process.env.DIRECT_URL ??
        "postgresql://snacktrack:snacktrack_dev@localhost:5432/snacktrack_test",
    },
    cwd: new URL("../../", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"),
    stdio: "inherit",
  });
  console.log("Database ready for integration tests.");
}

export async function teardown() {
  console.log("Integration test teardown complete.");
}
