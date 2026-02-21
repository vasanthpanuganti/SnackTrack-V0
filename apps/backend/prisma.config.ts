import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL or DIRECT_URL must be set for migrations");
}

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrate: {
    url: databaseUrl,
    shadowDatabaseUrl: undefined,
  },
});
