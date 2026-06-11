# SnackTrack

SnackTrack helps users eat better with meal tracking, nutrition insights, and AI-powered recipe recommendations.

📄 **Product docs:** [Product Requirements Document](docs/PRD.md) · [Security overview](docs/SECURITY.md) · [Environment variables](ENV.md)

## Who is this for?

- **People building healthier eating habits** and tracking meals daily.
- **Fitness-focused users** who want calorie and macro awareness.
- **Busy users** who want quick meal planning and smart recipe suggestions.
- **Teams building nutrition products** who want a modern full-stack starter.

## What this product offers

- **Meal logging**: A daily diary with unified USDA + Spoonacular food search that autofills macros.
- **Nutrition overview**: Live calorie ring, macro progress, and a 7-day trend chart. Targets come from your preferences or are estimated with Mifflin–St Jeor.
- **Recipe catalog**: Browse and search recipes with images, diet filters, ingredients, and step-by-step instructions.
- **Meal plans**: One-tap daily/weekly plan generation matched to your calorie target, with in-place meal swaps.
- **Smart recommendations**: Personalized picks from the ML service, with a graceful general-catalog fallback.
- **Allergen guardrails**: Flag the FDA top-9 allergens once; unsafe recipes are filtered everywhere.
- **Auth + profiles**: Supabase-backed signup/login, profile, preferences, units, dark mode.

## Tech stack (high-level)

- **Frontend**: Next.js 15 + React 19 + Tailwind CSS v4 + framer-motion (`apps/frontend`)
- **Backend API**: Express 5 + TypeScript (`apps/backend`)
- **ML service**: Python FastAPI (`apps/ml-service`)
- **Database**: PostgreSQL (+pgvector) + Prisma 7
- **Cache/queues**: Redis + BullMQ
- **Monorepo tooling**: pnpm + Turbo

## Quick start (simple)

### 1) Prerequisites

- Node.js `>=20`
- pnpm `>=9`
- Docker (recommended for local services)

### 2) Install dependencies

```bash
pnpm install
```

### 3) Setup environment

```bash
cp .env.example .env
```

Then fill required values in `.env`:

- Supabase keys and URL
- `DATABASE_URL` and `DIRECT_URL`
- `SPOONACULAR_API_KEY`
- `USDA_API_KEY`
- `ML_SERVICE_URL`

Full variable docs: `ENV.md`. **Never commit `.env` files** — the repo `.gitignore` blocks every `.env*` variant except `.env.example`.

### 4) Start local infrastructure

```bash
pnpm docker:up
```

This starts Postgres, Redis, and the ML service. (If the ML service is down, the API still runs — recommendations fall back to the general catalog.)

### 5) Run migrations

```bash
pnpm db:migrate
```

Migrations create the full schema from scratch (works on a brand-new database).

### 6) Start the app

```bash
pnpm dev
```

Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:3001/api/v1/health`

## Useful commands

- `pnpm dev` - run frontend + backend
- `pnpm build` - build all apps
- `pnpm lint` - lint all packages
- `pnpm test` - run tests
- `pnpm test:integration` - backend integration tests (needs Postgres + Redis)
- `pnpm docker:up` - start Docker services
- `pnpm docker:down` - stop Docker services

## API overview

All endpoints are prefixed with `/api/v1`. Standard envelope: `{ status, data, error }`.

| Area | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /auth/signup` · `/auth/login` · `/auth/refresh` · `/auth/logout` · `/auth/oauth/:provider` (rate-limited) |
| Users | `GET/PATCH/DELETE /users/me` · `PUT /users/me/preferences` · `PUT /users/me/allergens` |
| Recipes | `GET /recipes` (search/filter/paginate) · `GET /recipes/:id` · `GET /recipes/recommendations` |
| Food | `GET /food/search` (USDA + Spoonacular with macros) |
| Meal logs | `POST/GET /meal-logs` · `DELETE /meal-logs/:id` |
| Meal plans | `POST /meal-plans/generate` · `GET /meal-plans` · `GET/PATCH/DELETE /meal-plans/:id` · `POST /meal-plans/:id/swap` |
| Nutrition | `GET /nutrition/daily` · `GET /nutrition/weekly` |
