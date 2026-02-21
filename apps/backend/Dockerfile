FROM node:20-slim AS base
RUN corepack enable

# Build stage
FROM base AS builder
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/config-eslint/package.json packages/config-eslint/
COPY packages/config-typescript/package.json packages/config-typescript/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared-types/ packages/shared-types/
COPY packages/config-eslint/ packages/config-eslint/
COPY packages/config-typescript/ packages/config-typescript/
COPY apps/backend/ apps/backend/

# Build shared-types first, then backend
RUN pnpm --filter @snacktrack/shared-types build
RUN pnpm --filter @snacktrack/backend build

# Production stage
FROM base AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types ./packages/shared-types
COPY --from=builder /app/apps/backend ./apps/backend

WORKDIR /app/apps/backend

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
