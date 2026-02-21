import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monorepoRoot = path.resolve(__dirname, "..", "..", "..", "..");

dotenv.config({ path: path.join(monorepoRoot, ".env") });
dotenv.config();

const isTest = process.env.NODE_ENV === "test";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  SUPABASE_URL: isTest ? z.string().default("http://localhost:54321") : z.string().url(),
  SUPABASE_ANON_KEY: isTest ? z.string().default("test-anon-key") : z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: isTest
    ? z.string().default("test-service-role-key")
    : z.string().min(1),
  SUPABASE_JWT_SECRET: isTest ? z.string().default("test-jwt-secret") : z.string().min(1),
  DATABASE_URL: isTest
    ? z.string().default("postgresql://localhost:5432/snacktrack_test")
    : z.string().min(1),
  DIRECT_URL: isTest
    ? z.string().default("postgresql://localhost:5432/snacktrack_test")
    : z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  SPOONACULAR_API_KEY: isTest ? z.string().default("test-spoonacular-key") : z.string().min(1),
  USDA_API_KEY: isTest ? z.string().default("test-usda-key") : z.string().min(1),
  SENTRY_DSN: z.string().optional(),
  ML_SERVICE_URL: isTest
    ? z.string().url().default("http://localhost:8000")
    : z.string().url(),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  CLOUDINARY_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
