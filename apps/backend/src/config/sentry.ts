import * as Sentry from "@sentry/node";
import { env } from "./env.js";

let initialized = false;

export function initializeSentry(): void {
  if (initialized || !env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0,
  });
  initialized = true;
}

export function captureMlFailure(
  error: unknown,
  context: { operation: string; userId?: string },
): void {
  if (!initialized) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag("feature", "ml");
    scope.setTag("operation", context.operation);
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    if (error instanceof Error) {
      Sentry.captureException(error);
      return;
    }

    Sentry.captureMessage(`ML failure: ${String(error)}`, "error");
  });
}
