import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config();

// Migrations and schema pushes must use the direct (non-pooled) connection;
// pgbouncer breaks DDL. The URL is optional here so `prisma generate` works
// without a database (e.g. CI lint/typecheck jobs and fresh clones).
// Database-touching commands fail with a clear error if neither var is set.
const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  ...(databaseUrl
    ? {
        datasource: { url: databaseUrl },
        migrate: { url: databaseUrl, shadowDatabaseUrl: undefined },
      }
    : {}),
});
