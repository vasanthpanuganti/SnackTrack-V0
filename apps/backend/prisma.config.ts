import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config();

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrate: {
    url: process.env.DATABASE_URL!,
    shadowDatabaseUrl: undefined,
  },
});
