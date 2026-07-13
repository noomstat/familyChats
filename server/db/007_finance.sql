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
