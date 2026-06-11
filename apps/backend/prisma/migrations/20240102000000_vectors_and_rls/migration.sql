-- =====================================================================
-- SnackTrack: pgvector columns, user_taste_profiles, and RLS policies
-- =====================================================================
-- This migration runs AFTER the Prisma-generated initial migration.
-- It adds pgvector columns and row-level security policies.
--
-- NOTE ON RLS ENFORCEMENT:
-- RLS policies use Supabase's auth.uid() and auth.role() functions.
-- The Prisma backend connects as the `postgres` superuser, which
-- BYPASSES RLS entirely. These policies serve as defense-in-depth
-- for any direct Supabase client SDK access (e.g., from a future
-- mobile app or admin dashboard using PostgREST).
-- Application-level authorization is the primary access control
-- for API routes (enforced in middleware/service layer).
-- =====================================================================

-- ─── Auth schema stubs for non-Supabase environments ─────────────
-- Supabase provides auth.uid() and auth.role() natively. For local
-- dev with plain PostgreSQL or CI environments, we create stubs.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;

    CREATE FUNCTION auth.uid() RETURNS uuid AS $fn$
      SELECT COALESCE(
        nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid
      );
    $fn$ LANGUAGE sql STABLE;

    CREATE FUNCTION auth.role() RETURNS text AS $fn$
      SELECT COALESCE(
        nullif(current_setting('request.jwt.claim.role', true), ''),
        'anon'
      );
    $fn$ LANGUAGE sql STABLE;
  END IF;
END
$$;

-- ─── Enable pgvector extension ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Vector columns on recipes ───────────────────────────────────
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredient_vector vector(128);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition_vector vector(12);

-- ─── User taste profiles (pgvector table, not managed by Prisma) ──
CREATE TABLE IF NOT EXISTS user_taste_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preference_vector vector(128),
  interaction_count INTEGER DEFAULT 0,
  cold_start BOOLEAN DEFAULT true,
  content_weight FLOAT DEFAULT 0.8,
  collab_weight FLOAT DEFAULT 0.2,
  last_trained_at TIMESTAMPTZ
);

-- ─── Vector indexes for similarity search ────────────────────────
-- IVFFlat indexes require sufficient row counts to be effective.
-- Uncomment and run manually once you have 1000+ recipes:
-- CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_vector
--   ON recipes USING ivfflat (ingredient_vector vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX IF NOT EXISTS idx_recipes_nutrition_vector
--   ON recipes USING ivfflat (nutrition_vector vector_cosine_ops) WITH (lists = 50);

-- ─── Row Level Security ──────────────────────────────────────────

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self ON users FOR ALL USING (id = auth.uid());

-- User allergens
ALTER TABLE user_allergens ENABLE ROW LEVEL SECURITY;
CREATE POLICY allergens_self ON user_allergens FOR ALL USING (user_id = auth.uid());

-- Dietary preferences
ALTER TABLE dietary_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY preferences_self ON dietary_preferences FOR ALL USING (user_id = auth.uid());

-- Meal plans
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY meal_plans_self ON meal_plans FOR ALL USING (user_id = auth.uid());

-- Meal plan items (access through parent plan)
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY meal_plan_items_self ON meal_plan_items
  FOR ALL USING (plan_id IN (SELECT id FROM meal_plans WHERE user_id = auth.uid()));

-- Meal logs
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY meal_logs_self ON meal_logs FOR ALL USING (user_id = auth.uid());

-- User interactions
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY interactions_self ON user_interactions FOR ALL USING (user_id = auth.uid());

-- User taste profiles
ALTER TABLE user_taste_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY taste_profiles_self ON user_taste_profiles FOR ALL USING (user_id = auth.uid());

-- Recommendation cache
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY rec_cache_self ON recommendation_cache FOR ALL USING (user_id = auth.uid());

-- Recipes: readable by all authenticated users, writable by service role only
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY recipes_read ON recipes FOR SELECT USING (true);
CREATE POLICY recipes_insert ON recipes FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY recipes_update ON recipes FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY recipes_delete ON recipes FOR DELETE USING (auth.role() = 'service_role');

-- Waitlist: public insert, admin read
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY waitlist_insert ON waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY waitlist_admin_read ON waitlist FOR SELECT USING (auth.role() = 'service_role');
