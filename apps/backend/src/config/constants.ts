export const API_PREFIX = "/api/v1";

export const RATE_LIMIT = {
  GLOBAL: { windowMs: 60_000, max: 60 },
  AUTH: { windowMs: 60_000, max: 10 },
};

export const SPOONACULAR_DAILY_LIMIT = 150;
export const SPOONACULAR_DAILY_BUFFER = 10;

export const CACHE_TTL = {
  FOOD_SEARCH: 3600,       // 1 hour
  RECIPE_DETAIL: 86400,    // 24 hours
  NUTRITION: 86400,        // 24 hours
  RECIPE_DB_DAYS: 30,      // 30 days in PostgreSQL
};

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};
