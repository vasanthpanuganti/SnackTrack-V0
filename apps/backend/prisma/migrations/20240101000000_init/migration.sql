-- =====================================================================
-- SnackTrack: initial schema
-- =====================================================================
-- Creates all Prisma-managed tables, indexes, and foreign keys.
-- Written idempotently (IF NOT EXISTS / guarded constraints) so it also
-- applies cleanly to databases that were previously set up via
-- `prisma db push`.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Tables ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    display_name text,
    date_of_birth date,
    gender text,
    height_cm double precision,
    weight_kg double precision,
    activity_level text,
    health_goal text,
    unit_preference text DEFAULT 'metric'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS user_allergens (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    allergen_type text NOT NULL,
    severity text DEFAULT 'severe'::text NOT NULL,
    is_custom boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_allergens_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS dietary_preferences (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    diet_type text,
    cuisine_preferences text[],
    max_prep_time_min integer,
    cooking_skill text,
    calorie_target integer,
    protein_target_g double precision,
    carb_target_g double precision,
    fat_target_g double precision,
    updated_at timestamp(3) without time zone NOT NULL,
    CONSTRAINT dietary_preferences_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS recipes (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    spoonacular_id integer,
    title text NOT NULL,
    image_url text,
    cloudinary_url text,
    ready_in_minutes integer,
    servings integer,
    calories double precision,
    protein_g double precision,
    carbs_g double precision,
    fat_g double precision,
    sodium_mg double precision,
    fiber_g double precision,
    sugar_g double precision,
    ingredients jsonb,
    allergens text[],
    diet_labels text[],
    cuisine_types text[],
    instructions jsonb,
    cached_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone,
    CONSTRAINT recipes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS meal_plans (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    calorie_target integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    CONSTRAINT meal_plans_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS meal_plan_items (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    plan_id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    day_number integer NOT NULL,
    meal_type text NOT NULL,
    servings double precision DEFAULT 1 NOT NULL,
    is_swapped boolean DEFAULT false NOT NULL,
    original_recipe_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT meal_plan_items_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS meal_logs (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    recipe_id uuid,
    meal_type text NOT NULL,
    food_name text NOT NULL,
    servings double precision DEFAULT 1 NOT NULL,
    calories double precision,
    protein_g double precision,
    carbs_g double precision,
    fat_g double precision,
    logged_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    synced boolean DEFAULT true NOT NULL,
    CONSTRAINT meal_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS user_interactions (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    interaction_type text NOT NULL,
    interaction_value double precision,
    context text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_interactions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS recommendation_cache (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    rank integer NOT NULL,
    score double precision NOT NULL,
    content_score double precision,
    collab_score double precision,
    generated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT recommendation_cache_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS waitlist (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    name text,
    source text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT waitlist_pkey PRIMARY KEY (id)
);

-- ─── Indexes ──────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users USING btree (email);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users USING btree (created_at);

CREATE UNIQUE INDEX IF NOT EXISTS user_allergens_user_id_allergen_type_key ON user_allergens USING btree (user_id, allergen_type);

CREATE UNIQUE INDEX IF NOT EXISTS dietary_preferences_user_id_key ON dietary_preferences USING btree (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS recipes_spoonacular_id_key ON recipes USING btree (spoonacular_id);
CREATE INDEX IF NOT EXISTS recipes_cached_at_idx ON recipes USING btree (cached_at);
CREATE INDEX IF NOT EXISTS recipes_expires_at_idx ON recipes USING btree (expires_at);
CREATE INDEX IF NOT EXISTS recipes_diet_labels_idx ON recipes USING gin (diet_labels);

CREATE INDEX IF NOT EXISTS meal_plans_user_id_status_idx ON meal_plans USING btree (user_id, status);
CREATE INDEX IF NOT EXISTS meal_plans_user_id_created_at_idx ON meal_plans USING btree (user_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS meal_plan_items_plan_id_day_number_meal_type_key ON meal_plan_items USING btree (plan_id, day_number, meal_type);

CREATE INDEX IF NOT EXISTS meal_logs_user_id_logged_at_idx ON meal_logs USING btree (user_id, logged_at);
CREATE INDEX IF NOT EXISTS meal_logs_user_id_meal_type_idx ON meal_logs USING btree (user_id, meal_type);

CREATE INDEX IF NOT EXISTS user_interactions_user_id_created_at_idx ON user_interactions USING btree (user_id, created_at);
CREATE INDEX IF NOT EXISTS user_interactions_recipe_id_idx ON user_interactions USING btree (recipe_id);

CREATE UNIQUE INDEX IF NOT EXISTS recommendation_cache_user_id_recipe_id_key ON recommendation_cache USING btree (user_id, recipe_id);
CREATE INDEX IF NOT EXISTS recommendation_cache_user_id_rank_idx ON recommendation_cache USING btree (user_id, rank);
CREATE INDEX IF NOT EXISTS recommendation_cache_generated_at_idx ON recommendation_cache USING btree (generated_at);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_key ON waitlist USING btree (email);

-- ─── Foreign keys (guarded for idempotency) ───────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_allergens_user_id_fkey') THEN
    ALTER TABLE user_allergens
      ADD CONSTRAINT user_allergens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dietary_preferences_user_id_fkey') THEN
    ALTER TABLE dietary_preferences
      ADD CONSTRAINT dietary_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_user_id_fkey') THEN
    ALTER TABLE meal_plans
      ADD CONSTRAINT meal_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_plan_items_plan_id_fkey') THEN
    ALTER TABLE meal_plan_items
      ADD CONSTRAINT meal_plan_items_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES meal_plans(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_plan_items_recipe_id_fkey') THEN
    ALTER TABLE meal_plan_items
      ADD CONSTRAINT meal_plan_items_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_logs_user_id_fkey') THEN
    ALTER TABLE meal_logs
      ADD CONSTRAINT meal_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_logs_recipe_id_fkey') THEN
    ALTER TABLE meal_logs
      ADD CONSTRAINT meal_logs_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_interactions_user_id_fkey') THEN
    ALTER TABLE user_interactions
      ADD CONSTRAINT user_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_interactions_recipe_id_fkey') THEN
    ALTER TABLE user_interactions
      ADD CONSTRAINT user_interactions_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recommendation_cache_user_id_fkey') THEN
    ALTER TABLE recommendation_cache
      ADD CONSTRAINT recommendation_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recommendation_cache_recipe_id_fkey') THEN
    ALTER TABLE recommendation_cache
      ADD CONSTRAINT recommendation_cache_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END
$$;
