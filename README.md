# SnackTrack

SnackTrack helps users eat better with meal tracking, nutrition insights, and AI-powered recipe recommendations.

## Who is this for?

- **People building healthier eating habits** and tracking meals daily.
- **Fitness-focused users** who want calorie and macro awareness.
- **Busy users** who want quick meal planning and smart recipe suggestions.
- **Teams building nutrition products** who want a modern full-stack starter.

## What this product offers

- **Meal logging**: Track what users eat every day.
- **Nutrition overview**: Show calories and macro progress in a simple dashboard.
- **Meal plans**: Generate daily/weekly plans and swap meals.
- **Smart recommendations**: Personalized recipe suggestions powered by the ML service.
- **Food + recipe data**: Uses Spoonacular and USDA APIs for nutrition information.
- **Auth + profiles**: User signup/login and profile-based preferences.

## Tech stack (high-level)

- **Frontend**: Next.js (`apps/frontend`)
- **Backend API**: Express + TypeScript (`apps/backend`)
- **ML service**: Python FastAPI (`apps/ml-service`)
- **Database**: PostgreSQL + Prisma
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
- `ML_SERVICE_URL` (required)

Full variable docs: `ENV.md`

### 4) Start local infrastructure

```bash
pnpm docker:up
```

This starts Postgres, Redis, and the ML service needed by backend recommendations.

### 5) Run migrations

```bash
pnpm db:migrate
```

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
- `pnpm test` - run tests
- `pnpm docker:up` - start Docker services
- `pnpm docker:down` - stop Docker services
