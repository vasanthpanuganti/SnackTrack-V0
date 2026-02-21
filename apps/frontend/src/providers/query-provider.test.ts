import { describe, expect, it } from "vitest";
import { createQueryClient } from "./query-provider";

describe("createQueryClient", () => {
  it("uses cache-friendly defaults to reduce unnecessary network requests", () => {
    const client = createQueryClient();
    const options = client.getDefaultOptions();

    expect(options.queries?.staleTime).toBe(5 * 60 * 1000);
    expect(options.queries?.gcTime).toBe(30 * 60 * 1000);
    expect(options.queries?.refetchOnWindowFocus).toBe(false);
    expect(options.queries?.refetchOnReconnect).toBe(false);
    expect(options.queries?.refetchOnMount).toBe(false);
    expect(options.mutations?.retry).toBe(0);
  });

  it("does not retry client-side errors and limits retries for server errors", () => {
    const client = createQueryClient();
    const retry = client.getDefaultOptions().queries
      ?.retry as (failureCount: number, error: unknown) => boolean;

    expect(retry(0, { response: { status: 404 } })).toBe(false);
    expect(retry(0, { response: { status: 503 } })).toBe(true);
    expect(retry(1, { response: { status: 503 } })).toBe(true);
    expect(retry(2, { response: { status: 503 } })).toBe(false);
  });
});
