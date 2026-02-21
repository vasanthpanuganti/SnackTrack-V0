import type { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis.js";
import { AppError } from "../utils/AppError.js";

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export function rateLimiter(
  config: RateLimitConfig = { windowMs: 60_000, max: 60 },
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Use user ID if authenticated, otherwise IP
    const identifier = req.user?.id ?? req.ip ?? "unknown";
    const key = `rl:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      const multi = redis.multi();
      multi.zremrangebyscore(key, 0, windowStart); // Remove expired entries
      multi.zadd(key, now.toString(), `${now}:${Math.random()}`); // Add current request
      multi.zcard(key); // Count requests in window
      multi.pexpire(key, config.windowMs); // Set TTL

      const results = await multi.exec();
      const requestCount = (results?.[2]?.[1] as number) ?? 0;

      res.setHeader("X-RateLimit-Limit", config.max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, config.max - requestCount));
      res.setHeader("X-RateLimit-Reset", new Date(now + config.windowMs).toISOString());

      if (requestCount > config.max) {
        throw new AppError(429, "RATE_LIMITED", "Too many requests, please try again later");
      }

      next();
    } catch (err) {
      if (err instanceof AppError) throw err;
      // If Redis is down, allow the request through (fail-open for availability)
      next();
    }
  };
}
