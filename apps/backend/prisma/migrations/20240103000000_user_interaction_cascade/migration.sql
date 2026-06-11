-- Align user_interactions.recipe_id with the schema's onDelete: Cascade.
-- The initial migration created this FK as ON DELETE RESTRICT; the schema
-- was later updated to Cascade (so deleting a recipe also drops its
-- interaction history) but shipped without a migration. This closes that
-- drift. Idempotent so it is safe on databases provisioned via db push.
ALTER TABLE "user_interactions"
  DROP CONSTRAINT IF EXISTS "user_interactions_recipe_id_fkey";

ALTER TABLE "user_interactions"
  ADD CONSTRAINT "user_interactions_recipe_id_fkey"
  FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
