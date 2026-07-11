-- Family Finance (#9): shared expenses/split bills, settlements, monthly
-- budget. Family-wide (not per-group) — same client-generated-id +
-- ON CONFLICT DO NOTHING idempotency pattern as chat/lists/events/albums.

CREATE TABLE IF NOT EXISTS expenses (
  id          text PRIMARY KEY,
  family_id   text NOT NULL REFERENCES families (id),
  label       text NOT NULL,
  category_id text NOT NULL CHECK (category_id IN ('food', 'stay', 'trans', 'gear', 'refund')),
  amount      numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_by     text NOT NULL REFERENCES users (id),
  split_among text[] NOT NULL,
  receipt_path text,
  created_by  text REFERENCES users (id),
  ts          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_family_ts_idx ON expenses (family_id, ts);

-- Settlements ("Settle up") — a payment from one member to another.
CREATE TABLE IF NOT EXISTS transfers (
  id         text PRIMARY KEY,
  family_id  text NOT NULL REFERENCES families (id),
  from_id    text NOT NULL REFERENCES users (id),
  to_id      text NOT NULL REFERENCES users (id),
  amount     numeric(12,2) NOT NULL CHECK (amount > 0),
  ts         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transfers_family_ts_idx ON transfers (family_id, ts);

-- One monthly budget row per family per month ('YYYY-MM').
CREATE TABLE IF NOT EXISTS budgets (
  family_id text NOT NULL REFERENCES families (id),
  month     text NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  amount    numeric(12,2) NOT NULL CHECK (amount > 0),
  PRIMARY KEY (family_id, month)
);

-- Demo seed: family "The Nows" (fam-nows), current month, budget ฿35,000 and
-- six expenses summing to ฿22,500 (each split among all 5 members) — matches
-- the plan's example: 35,000 budget / 22,500 spent / 12,500 remaining.
INSERT INTO budgets (family_id, month, amount) VALUES
  ('fam-nows', to_char(now(), 'YYYY-MM'), 35000)
ON CONFLICT (family_id, month) DO NOTHING;

INSERT INTO expenses (id, family_id, label, category_id, amount, paid_by, split_among, created_by, ts) VALUES
  ('seed-exp-1', 'fam-nows', 'Groceries',          'food',  5200, 'mara', ARRAY['you','mara','dev','sam','mom'], 'mara', now() - interval '6 days'),
  ('seed-exp-2', 'fam-nows', 'Family dinner',      'food',  4200, 'you',  ARRAY['you','mara','dev','sam','mom'], 'you',  now() - interval '5 days'),
  ('seed-exp-3', 'fam-nows', 'Weekend trip fuel',  'trans', 3300, 'you',  ARRAY['you','mara','dev','sam','mom'], 'you',  now() - interval '4 days'),
  ('seed-exp-4', 'fam-nows', 'School supplies',    'gear',  2500, 'dev',  ARRAY['you','mara','dev','sam','mom'], 'dev',  now() - interval '3 days'),
  ('seed-exp-5', 'fam-nows', 'Utilities',          'stay',  3800, 'sam',  ARRAY['you','mara','dev','sam','mom'], 'sam',  now() - interval '2 days'),
  ('seed-exp-6', 'fam-nows', 'Road trip snacks',   'trans', 3500, 'mara', ARRAY['you','mara','dev','sam','mom'], 'mara', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;
