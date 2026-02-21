import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Mock database and redis health checks
vi.mock("../src/config/database.js", () => ({
  isDatabaseHealthy: vi.fn().mockResolvedValue(true),
  prisma: {},
}));

vi.mock("../src/config/redis.js", () => ({
  isRedisHealthy: vi.fn().mockResolvedValue(true),
  redis: { on: vi.fn() },
}));

import { createApp } from "../src/app.js";
import { isDatabaseHealthy } from "../src/config/database.js";
import { isRedisHealthy } from "../src/config/redis.js";

const app = createApp();

describe("Health endpoint", () => {
  it("GET /api/v1/health returns 200 when all services healthy", async () => {
    vi.mocked(isDatabaseHealthy).mockResolvedValue(true);
    vi.mocked(isRedisHealthy).mockResolvedValue(true);

    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data).toHaveProperty("uptime");
    expect(res.body.data).toHaveProperty("timestamp");
    expect(res.body.data).toHaveProperty("version");
    expect(res.body.data.services.database).toBe(true);
    expect(res.body.data.services.redis).toBe(true);
    expect(res.body.error).toBeNull();
  });

  it("GET /api/v1/health returns 503 when database is unhealthy", async () => {
    vi.mocked(isDatabaseHealthy).mockResolvedValue(false);
    vi.mocked(isRedisHealthy).mockResolvedValue(true);

    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("error");
    expect(res.body.data.services.database).toBe(false);
    expect(res.body.data.services.redis).toBe(true);
    expect(res.body.error.code).toBe("SERVICE_DEGRADED");
  });

  it("GET /api/v1/health returns 503 when redis is unhealthy", async () => {
    vi.mocked(isDatabaseHealthy).mockResolvedValue(true);
    vi.mocked(isRedisHealthy).mockResolvedValue(false);

    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("error");
    expect(res.body.data.services.database).toBe(true);
    expect(res.body.data.services.redis).toBe(false);
  });

  it("GET /api/v1/health includes X-Request-Id header", async () => {
    vi.mocked(isDatabaseHealthy).mockResolvedValue(true);
    vi.mocked(isRedisHealthy).mockResolvedValue(true);

    const res = await request(app).get("/api/v1/health");

    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("respects provided X-Request-Id header", async () => {
    vi.mocked(isDatabaseHealthy).mockResolvedValue(true);
    vi.mocked(isRedisHealthy).mockResolvedValue(true);

    const customId = "test-request-123";
    const res = await request(app)
      .get("/api/v1/health")
      .set("X-Request-Id", customId);

    expect(res.headers["x-request-id"]).toBe(customId);
  });
});

describe("404 handling", () => {
  it("returns structured error for unknown routes", async () => {
    const res = await request(app).get("/api/v1/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("error");
    expect(res.body.data).toBeNull();
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
