-- Phase R — per-family user-addable custom expense categories. The 5
-- built-ins (food/stay/trans/gear/refund) stay client-side constants
-- (app/src/store/model.ts); this table only holds the custom ones a family
-- adds on top. Same client-generated-id + ON CONFLICT DO NOTHING idempotency
-- pattern as chat/lists/events/albums/notes.
--
-- Dropping the expenses.category_id CHECK constraint (added in 007_finance.sql,
-- confirmed via pg_constraint as `expenses_category_id_check`) lets custom
-- category ids be stored on an expense row — validity is now enforced in
-- application code (server/src/finance.js's addExpense: built-in OR exists in
-- this family's expense_categories) instead of a fixed DB enum.

CREATE TABLE IF NOT EXISTS expense_categories (
  id         text PRIMARY KEY,
  family_id  text NOT NULL REFERENCES families (id),
  label      text NOT NULL,
  icon       text NOT NULL,
  color      text NOT NULL,
  income     boolean NOT NULL DEFAULT false,
  created_by text REFERENCES users (id),
  ts         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expense_categories_family_idx ON expense_categories (family_id);

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_id_check;
