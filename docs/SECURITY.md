# SnackTrack — Security Overview

This document describes the security posture of the V0 build: what is
implemented, how secrets are handled, and the known trade-offs queued for V1.

## Secrets & environment

- **No secrets in the repo.** Every `.env*` variant is git-ignored at the root
  (`.env`, `.env.*`) with only `.env.example` (placeholders) tracked. The
  frontend has its own `.env*` ignore. Key material (`*.pem`, `*.key`,
  `*.p12`, `*.pfx`) is ignored too.
- **History audited.** Git history contains no committed `.env`, key, or
  credential files.
- **Validated at boot.** The backend refuses to start with missing/malformed
  env vars (Zod schema in `src/config/env.ts`), so misconfiguration fails
  loudly instead of silently.
- **Browser exposure is explicit.** Only `NEXT_PUBLIC_*` variables reach the
  client bundle; they are documented as public and must never hold secrets.
- The Supabase `service_role` key and `DATABASE_URL` live only on the server.

## API hardening

| Control | Implementation |
| --- | --- |
| Security headers | `helmet()` on every response; `x-powered-by` disabled |
| CORS | Strict origin allowlist from `CORS_ORIGINS`; no wildcard |
| Rate limiting | Redis sliding-window, scoped: 60/min global per user/IP, 10/min on signup/login/refresh/oauth. Fails open if Redis is down (availability over throttling) |
| Input validation | Zod schemas on body, query, and params for every route; UUID validation on all `:id` params |
| AuthN | Supabase-verified JWT on every protected route (`requireAuth`); optional-auth routes degrade rather than leak |
| AuthZ | Ownership checks on all user-scoped resources (meal logs, plans) return 403/404 without leaking other users' data |
| Open-redirect defense | OAuth `redirectTo` must match a configured CORS origin |
| Error hygiene | Central handler returns structured codes; stack traces and internals never reach clients; 500s log with request IDs |
| Admin surfaces | Bull Board queue UI is development-only **and** behind authentication |
| Outbound calls | 8s timeouts on Spoonacular/USDA so upstream hangs can't exhaust the request pool |

## Frontend hardening

- Security headers via `next.config.ts`: `X-Frame-Options: SAMEORIGIN`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, restrictive `Permissions-Policy`;
  `poweredByHeader` disabled.
- Client-side validation mirrors the backend password policy (no weaker path).
- Images restricted to an explicit `remotePatterns` allowlist.
- 401 handling clears tokens and redirects; a single transparent
  refresh-and-retry prevents token-replay loops.

## Infrastructure

- **Database**: RLS policies exist as defense-in-depth for any direct
  PostgREST access; the API enforces authorization at the service layer.
  Migrations are idempotent and bootstrap a fresh database.
- **Docker**: backend runs as the unprivileged `node` user with a container
  `HEALTHCHECK`; `NODE_ENV=production` baked into the runtime stage.
- **Graceful shutdown**: drains jobs, closes DB/Redis, force-exits after 10s
  (unref'd timer).

## Known trade-offs (planned for V1)

1. **Tokens in `localStorage`.** Access/refresh tokens are XSS-exfiltratable.
   Planned: httpOnly, SameSite cookie sessions via a backend-for-frontend,
   which also enables CSRF tokens.
2. **No Content-Security-Policy yet.** Requires a nonce pipeline with
   Next.js; scheduled with the cookie-session work.
3. **No per-user audit log** of security-relevant events (logins, deletions).

## Reporting

Found a vulnerability? Please open a private security advisory on the
repository rather than a public issue.
