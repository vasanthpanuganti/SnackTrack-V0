# Environment Variables Reference

SnackTrack uses a single `.env` file at the **repository root**. Turbo treats it as a global dependency (`turbo.json` → `globalDependencies`), so any change invalidates the build cache automatically.

## Quick Start

```bash
cp .env.example .env
# Fill in the values described below, then:
pnpm install
pnpm docker:up   # starts Postgres + Redis (+ backend/ml-service)
pnpm dev          # runs backend + frontend via Turbo
```

## Variable Reference

### General

| Variable   | Required | Default       | Description                        |
| ---------- | -------- | ------------- | ---------------------------------- |
| `NODE_ENV` | No       | `development` | `development`, `production`, `test` |
| `PORT`     | No       | `3001`        | Port the backend server listens on |

### Supabase

All four are **required** in development/production (auto-defaulted in test mode).

| Variable                   | Where to get it                                          |
| -------------------------- | -------------------------------------------------------- |
| `SUPABASE_URL`             | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY`        | Supabase Dashboard → Project Settings → API → `anon` key  |
| `SUPABASE_SERVICE_ROLE_KEY`| Supabase Dashboard → Project Settings → API → `service_role` key |
| `SUPABASE_JWT_SECRET`      | Supabase Dashboard → Project Settings → API → JWT Secret |

### Database (Prisma)

Both are **required** in development/production.

| Variable       | Format | Notes |
| -------------- | ------ | ----- |
| `DATABASE_URL` | `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true` | Uses the **pooled** connection (port 6543 via PgBouncer). Used by Prisma Client at runtime. |
| `DIRECT_URL`   | `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres` | Uses the **direct** connection (port 5432). Used by Prisma Migrate for DDL operations. |

**How to fill these in:**

1. Go to Supabase Dashboard → your project → **Project Settings** → **Database**.
2. Copy the connection strings, or note the **database password** you set when creating the project.
3. Replace `PASSWORD` with your database password and `PROJECT_REF` with your project reference ID (the subdomain in your `SUPABASE_URL`, e.g. `abcdef123456`).

> **Local Docker alternative:** If you use `pnpm docker:up` for Postgres instead of Supabase, use:
> ```
> DATABASE_URL=postgresql://snacktrack:snacktrack_dev@localhost:5432/snacktrack
> DIRECT_URL=postgresql://snacktrack:snacktrack_dev@localhost:5432/snacktrack
> ```

### Redis

| Variable    | Required | Default                  | Notes |
| ----------- | -------- | ------------------------ | ----- |
| `REDIS_URL` | No       | `redis://localhost:6379` | Default works with `pnpm docker:up` or a local Redis server. |

### External APIs

Both are **required** in development/production.

| Variable             | Where to get it |
| -------------------- | --------------- |
| `SPOONACULAR_API_KEY`| Sign up at [spoonacular.com/food-api/console](https://spoonacular.com/food-api/console) and copy your API key. |
| `USDA_API_KEY`       | Request a key at [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup). |

### ML Service

| Variable         | Required | Default                  | Notes |
| ---------------- | -------- | ------------------------ | ----- |
| `ML_SERVICE_URL` | Yes (dev/prod) | `http://localhost:8000`  | Points to the Python ML service. Backend startup now fails fast if ML health check fails, because personalized recommendations are a core feature. |

### CORS

| Variable       | Required | Default                  | Notes |
| -------------- | -------- | ------------------------ | ----- |
| `CORS_ORIGINS` | No       | `http://localhost:3000`  | Comma-separated list of allowed origins. Include the frontend URL and any mobile dev URLs (e.g. Expo). |

### Optional Services

| Variable        | Required | Format / Notes |
| --------------- | -------- | -------------- |
| `SENTRY_DSN`    | No       | Sentry DSN URL for error tracking. Leave empty to disable. |
| `CLOUDINARY_URL`| No       | Full Cloudinary URL: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`. Get credentials from Cloudinary Dashboard → Settings → Product environment credentials. Leave empty if not using image uploads. |

## Validation

The backend validates all environment variables at startup using Zod (`apps/backend/src/config/env.ts`). If any required variable is missing or malformed, the process exits with a descriptive error listing the invalid fields.

## Where `.env` Lives

The `.env` file belongs at the **repository root** (next to `package.json` and `turbo.json`). Both the backend and Prisma config load environment variables via `dotenv/config`, which reads from the process working directory. When running through Turbo (`pnpm dev` from root), the root `.env` is loaded correctly.
