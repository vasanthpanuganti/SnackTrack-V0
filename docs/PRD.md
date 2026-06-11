# SnackTrack — Product Requirements Document

| | |
| --- | --- |
| **Product** | SnackTrack — AI-powered nutrition tracking & meal planning |
| **Version** | 1.0 (V0 platform release) |
| **Status** | Approved for build · shipped behind this document |
| **Author** | Product Management |
| **Last updated** | June 2026 |

---

## 1. Executive summary

SnackTrack is a full-stack nutrition platform that makes eating well feel effortless. Users log meals in seconds, see calories and macros build in real time against personalized targets, and receive recipe recommendations and auto-generated meal plans that respect their diet, taste, and allergies.

The category problem is not awareness — it's **abandonment**. Most food trackers lose the majority of new users within two weeks because logging is tedious, targets are generic, and recommendations ignore real constraints (especially allergens). SnackTrack's product thesis: **remove the three friction points that kill the habit** — slow logging, meaningless targets, and irrelevant suggestions.

## 2. Problem statement

1. **Logging friction.** Manual entry of calories/macros per meal takes minutes, not seconds. Users quit when the cost of logging exceeds the perceived benefit.
2. **Generic guidance.** A flat "2,000 kcal" target ignores body metrics, activity, and goals, so progress feels arbitrary and motivation decays.
3. **Decision fatigue.** "What should I eat tonight?" remains unanswered by trackers that only look backward at what you ate.
4. **Safety gaps.** People with allergies and intolerances must manually vet every recipe — a constant tax and a real risk.

## 3. Goals & non-goals

### Goals (V0)

| # | Goal | How V0 delivers |
| --- | --- | --- |
| G1 | Meal logging in under 10 seconds | Unified USDA + Spoonacular food search with macro autofill; one-tap "log this recipe" |
| G2 | Personally meaningful targets | Mifflin–St Jeor estimation from profile (with activity & goal adjustments), overridable explicit targets |
| G3 | Answer "what should I eat?" | ML-ranked recommendations + one-tap daily/weekly meal-plan generation with in-place swaps |
| G4 | Allergen safety by default | FDA top-9 allergen flags with severity; unsafe recipes filtered from search, plans, and picks |
| G5 | A product people enjoy opening | Editorial-grade UI: food photography, smooth motion, dark mode, sub-second perceived loads |

### Non-goals (V0)

- Barcode scanning and photo-based food recognition (schema reserves a `barcode` source for later).
- Social features (sharing, friends, leaderboards).
- Native mobile apps (the web app is responsive; Expo is anticipated in tooling).
- Micronutrient deep-dives beyond sodium/fiber/sugar.
- Paid plans, billing, or entitlements.

## 4. Target users & personas

1. **Habit-builder Hana (primary).** Wants to eat better without a spreadsheet lifestyle. Success = logging feels lighter than skipping it.
2. **Macro-focused Marcus.** Lifts 4×/week, cares about protein targets and weekly consistency. Success = accurate targets and a 7-day trend he trusts.
3. **Allergy-aware Aisha.** Severe peanut allergy; vets every recipe today. Success = never seeing an unsafe recipe in the product, period.
4. **Time-poor Theo.** Decides dinner at 6:47pm. Success = a credible plan generated in one tap, swappable in two.

## 5. Success metrics

| Metric | Definition | V0 target |
| --- | --- | --- |
| Activation | % of signups who log ≥1 meal in first session | ≥ 60% |
| Week-2 retention | % of activated users logging ≥3 days in week 2 | ≥ 35% |
| Time-to-log | Median seconds from "Add food" to saved log | ≤ 10s |
| Recommendation engagement | CTR on "For you" recipe cards | ≥ 25% |
| Plan adoption | % of generated plans with ≥1 meal logged from them | ≥ 40% |
| Allergen incidents | Flagged-allergen recipes shown to flagged users | 0 |
| API p95 latency | Read endpoints, warm cache | < 300ms |

## 6. Functional requirements

### 6.1 Authentication & accounts

- Email/password signup (display name required) and login via Supabase Auth; password policy: ≥8 chars with upper, lower, and number — enforced identically client- and server-side.
- Session: short-lived access token + refresh token; the client transparently refreshes once on 401 and retries.
- OAuth (Google/Apple) endpoint exists server-side with redirect-origin allowlisting (UI integration is post-V0).
- Account deletion permanently removes all user data (DB cascade + Supabase Auth deletion).
- **Acceptance:** invalid credentials never reveal which factor failed; auth endpoints are rate-limited (10/min/IP); logout clears local tokens even if the server call fails.

### 6.2 Profile, preferences & targets

- Profile: display name, DOB, gender, height, weight, activity level, health goal, unit preference.
- Preferences: diet type (10 options), favorite cuisines, max prep time, cooking skill, explicit calorie/macro targets.
- Targets resolution order: explicit targets → Mifflin–St Jeor estimate (BMR × activity multiplier ± goal adjustment, floor 1,200 kcal) → 2,000 kcal default. The UI labels estimates as such.
- **Acceptance:** changing preferences immediately recomputes dashboard percentages; all writes validated by shared Zod schemas.

### 6.3 Meal diary (logging)

- Day view grouped by breakfast/lunch/dinner/snack with per-meal subtotals and a day summary strip; previous/next-day navigation.
- Add food via: (a) food search (USDA + Spoonacular) with macro autofill, or (b) manual entry; servings multiplier applies to all macros.
- Logs created from a recipe carry `recipeId` and `source` for the recommender feedback loop.
- Delete with confirmation; totals update optimistically via cache invalidation.
- **Acceptance:** logging on a past day buckets to that day; list API is cursor-paginated; sub-second perceived add (toast + invalidation).

### 6.4 Recipe catalog

- Browse with search, diet filter chips, and pagination (12/page). Search hits Spoonacular (results cached to Postgres for 30 days) and **degrades gracefully to local catalog search** when the external API is down or over quota.
- Detail page: hero image, time/servings/calories, 6 macro stats, ingredients checklist, numbered instructions, cuisine/diet badges, and a "Log this meal" dialog.
- Authenticated users see allergen-filtered results; the detail page shows an explicit warning banner when a recipe contains a flagged allergen.
- **Acceptance:** broken/missing images always render a branded fallback (never a broken-image glyph); recipe detail is served from Redis cache (24h TTL) when warm.

### 6.5 Recommendations ("For you")

- ML service returns ranked recipe IDs per user; backend resolves, orders, and returns full recipes with a `recommendationMode` of `personalized` or `general` (fallback), surfaced in the UI as a badge.
- Implicit feedback captured: plan swaps record reject/accept interactions; model retraining is fire-and-forget after swaps and signup.
- **Acceptance:** ML outage never breaks the page — general picks render with the "Popular picks" badge; refresh re-queries without a full reload.

### 6.6 Meal plans

- Generate **daily** (3 meals) or **weekly** (21 meals) plans: recipes chosen closest to per-meal calorie targets (25/35/35 split), preferring ML-ranked recipes, excluding allergens and respecting diet/prep-time preferences.
- Plan view: expandable cards → day-by-day grid with recipe images; per-slot **swap** replaces the meal with the next best safe alternative and records the interaction.
- Manage: rename/archive (PATCH), delete with confirmation.
- **Acceptance:** generation fails with a clear, actionable message when no safe recipes exist; swap latency is one request (replacement chosen server-side).

### 6.7 Dashboard

- Greeting with date and first name; "Log a meal" primary CTA.
- Animated calorie ring (consumed vs target, over-target state), three macro progress bars, 7-day calorie area chart, today's meal list, top-3 recommendations, and shortcuts.
- **Acceptance:** renders meaningfully with zero data (empty states with CTAs); all numbers reconcile with the diary.

### 6.8 Cross-cutting UX

- Editorial design system: Fraunces display serif + Inter UI sans (self-hosted, zero CLS), warm porcelain light theme + deep forest dark theme, food photography, glass surfaces.
- Motion: page transitions, staggered card reveals, animated gauges — all respecting `prefers-reduced-motion`.
- Responsive from 360px; mobile gets a sheet-based nav. Accessible: semantic landmarks, focus rings, aria-pressed chips, labeled icon buttons.

## 7. System overview (for PM/eng alignment)

- **Monorepo:** pnpm + Turbo; apps: `frontend` (Next.js 15/React 19), `backend` (Express 5/TS), `ml-service` (FastAPI); shared `@snacktrack/shared-types` package is the single source of truth for API types and Zod schemas.
- **Data:** Postgres (+pgvector for taste vectors) via Prisma 7; migrations bootstrap a fresh database end-to-end. Redis for caching (recipe detail 24h, food search 1h, daily nutrition 24h), rate limiting, and BullMQ queues.
- **Background jobs:** nightly recipe-cache refresh, hourly nutrition precompute, 6-hourly stale-recommendation cleanup, daily Spoonacular quota reset — all with bounded concurrency.
- **External dependencies & quotas:** Spoonacular (150/day budget with reserve buffer + Redis counter; 8s timeouts), USDA FoodData Central (8s timeouts). Both degrade gracefully.
- **Reliability posture:** API hard-depends only on Postgres + Redis (health endpoint semantics match); ML is optional at runtime; keep-alive tuned for load balancers; graceful shutdown drains jobs and connections.

## 8. Security & privacy (V0 posture)

Implemented: Helmet security headers; strict CORS allowlist; per-scope Redis rate limiting (global 60/min, auth 10/min); Zod validation on every body/query/param; UUID param validation; OAuth redirect allowlisting; Supabase-verified JWTs on every protected route; ownership checks on all user resources; secrets only via environment (all `.env*` git-ignored except the example; history audited clean); Next.js security headers + frame denial; non-root Docker runtime with container healthchecks; dependency surface pinned via lockfile.

Known trade-offs (documented for V1): tokens stored in `localStorage` (XSS-exfiltratable; mitigation candidate: httpOnly cookie sessions via a BFF), no CSP nonce pipeline yet, no per-user audit log. See `docs/SECURITY.md`.

Privacy: health-adjacent data (weight, goals, allergens) is sensitive — V0 collects the minimum, deletes on account removal, and never shares it with third parties beyond the recipe APIs (which receive queries, not identities).

## 9. Performance requirements

| Surface | Requirement |
| --- | --- |
| API reads (warm cache) | p95 < 300ms |
| API writes | p95 < 500ms |
| Weekly nutrition | Single-query computation (no N+1) |
| Frontend | First Load JS ≤ 170kB on marketing, code-split dashboard; images lazy + optimized via next/image |
| Jobs | Batched with bounded concurrency; one failure never aborts a batch |

## 10. Release criteria (V0 — all met)

- ✅ Monorepo builds green (`pnpm build`), lint green across 5 packages, 47 backend unit tests, 3 integration tests (stable across repeated runs), 11 frontend tests.
- ✅ Fresh-database migration path verified end-to-end.
- ✅ All 12 frontend routes implemented against the real API contract (no phantom endpoints).
- ✅ Health endpoint reflects true serving capability; ML outage is non-fatal.
- ✅ Secrets audit: no env files or keys in repo or git history.

## 11. Risks & mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Spoonacular quota exhaustion | Search/refresh degraded | Redis quota counter with buffer; 30-day Postgres cache; local-catalog fallback search |
| ML service instability | Worse recommendations | General-catalog fallback + UI badge; fire-and-forget training |
| Cold catalog on new deploys | Empty browse page | Seed script; search-triggered cache fill; empty states prompt a search |
| Token theft via XSS | Account compromise | Strict headers now; BFF cookie session planned (V1); short token TTL + rotation |
| Nutrition data accuracy | User trust | Source attribution (USDA/Spoonacular); manual override always available |

## 12. Roadmap (post-V0)

1. **V0.5 — Trust & polish:** barcode scanning, recents/favorites for 2-tap logging, weekly email digest, onboarding flow that captures profile → first plan in <2 minutes.
2. **V1 — Engagement:** httpOnly cookie sessions (BFF), streaks & gentle nudges, water/weight tracking, recipe collections, shareable plans.
3. **V1.5 — Intelligence:** photo meal logging, pantry-aware plan generation ("use what I have"), grocery list export.
4. **V2 — Platform:** native mobile (Expo), premium tier (advanced analytics, dietitian mode), B2B API.

## 13. Open questions

- Should weekly plans support per-day calorie variation (training vs rest days)?
- Is `snack` a default slot in generated plans (currently 25/35/35 across 3 meals)?
- Unit preference currently affects display only — do we convert inputs (lb/ft) at the field level in V0.5?
- Recommendation explanations ("why this pick") — value vs. model-complexity cost?
