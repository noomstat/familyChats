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

-- Demo seed: family "The Nows" (fam-nows) grocery list + task board.
INSERT INTO grocery_items (id, family_id, label, qty, checked_by, checked_at, created_by, ts) VALUES
  ('seed-groc-1', 'fam-nows', 'Milk',          '2',  NULL,   NULL,                              'you',  now() - interval '3 hours'),
  ('seed-groc-2', 'fam-nows', 'Eggs',          NULL, 'mara', now() - interval '90 minutes',      'mara', now() - interval '5 hours'),
  ('seed-groc-3', 'fam-nows', 'Bread',         NULL, NULL,   NULL,                              'mara', now() - interval '2 hours'),
  ('seed-groc-4', 'fam-nows', 'Coffee beans',  NULL, NULL,   NULL,                              'you',  now() - interval '40 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks (id, family_id, title, notes, assignee_id, due_date, done, done_by, done_at, created_by, ts) VALUES
  ('seed-task-1', 'fam-nows', 'Book cabin for August', 'Check the usual spot first', 'you', (CURRENT_DATE + INTERVAL '7 days')::date, false, NULL,  NULL,                          'mara', now() - interval '1 day'),
  ('seed-task-2', 'fam-nows', 'Fix the bike',          NULL,                         'dev', NULL,                                      false, NULL,  NULL,                          'you',  now() - interval '6 hours'),
  ('seed-task-3', 'fam-nows', 'Call grandma',          NULL,                         NULL,  NULL,                                      true,  'mom', now() - interval '20 minutes', 'mom',  now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;
