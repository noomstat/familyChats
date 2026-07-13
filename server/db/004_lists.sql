-- Shared Grocery List (#3) + Shared Tasks (#4). Same client-generated-id +
-- ON CONFLICT DO NOTHING idempotency pattern as chat (003_chat.sql).

CREATE TABLE IF NOT EXISTS grocery_items (
  id         text PRIMARY KEY,
  family_id  text NOT NULL REFERENCES families (id),
  label      text NOT NULL,
  qty        text,
  checked_by text REFERENCES users (id),
  checked_at timestamptz,
  created_by text REFERENCES users (id),
  ts         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grocery_items_family_ts_idx ON grocery_items (family_id, ts);

CREATE TABLE IF NOT EXISTS tasks (
  id          text PRIMARY KEY,
  family_id   text NOT NULL REFERENCES families (id),
  title       text NOT NULL,
  notes       text,
  assignee_id text REFERENCES users (id),
  due_date    date,
  done        boolean NOT NULL DEFAULT false,
  done_by     text REFERENCES users (id),
  done_at     timestamptz,
  created_by  text REFERENCES users (id),
  ts          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_family_ts_idx ON tasks (family_id, ts);
