-- Family Chat: groups, membership, messages, and per-user read cursors.
-- Client-generated ids throughout (uid() pattern) -> inserts are idempotent
-- via ON CONFLICT DO NOTHING, matching the optimistic-UI approach in the app.

CREATE TABLE IF NOT EXISTS groups (
  id         text PRIMARY KEY,
  family_id  text NOT NULL REFERENCES families (id),
  name       text NOT NULL,
  created_by text REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id text NOT NULL REFERENCES groups (id),
  user_id  text NOT NULL REFERENCES users (id),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id          text PRIMARY KEY,
  group_id    text NOT NULL REFERENCES groups (id),
  author_id   text NOT NULL REFERENCES users (id),
  kind        text NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'loc', 'voice')),
  body        text,
  loc         jsonb,
  media_path  text,
  duration_ms int,
  ts          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_group_ts_idx ON messages (group_id, ts DESC);
CREATE INDEX IF NOT EXISTS messages_ts_idx ON messages (ts);

CREATE TABLE IF NOT EXISTS read_cursors (
  group_id     text NOT NULL REFERENCES groups (id),
  user_id      text NOT NULL REFERENCES users (id),
  last_read_ts timestamptz NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- Demo seed: 5 groups in family "The Nows" (fam-nows), mirroring the vibe of
-- the app's original local-only demo data (app/src/store/model.ts
-- SEED_MESSAGES), now with real staggered timestamps instead of a frozen
-- reference clock.
INSERT INTO groups (id, family_id, name, created_by) VALUES
  ('trail',  'fam-nows', 'Trail Crew',    'you'),
  ('climb',  'fam-nows', 'Weekend Climb', 'you'),
  ('dev-dm', 'fam-nows', 'Dev Kaur',      'you'),
  ('food',   'fam-nows', 'Taco Tuesday',  'you'),
  ('fam',    'fam-nows', 'Family',        'you')
ON CONFLICT (id) DO NOTHING;

INSERT INTO group_members (group_id, user_id) VALUES
  ('trail', 'you'), ('trail', 'mara'), ('trail', 'dev'), ('trail', 'sam'),
  ('climb', 'you'), ('climb', 'mara'), ('climb', 'dev'), ('climb', 'sam'),
  ('dev-dm', 'you'), ('dev-dm', 'dev'),
  ('food', 'you'), ('food', 'mara'), ('food', 'dev'), ('food', 'sam'),
  ('fam', 'you'), ('fam', 'mara'), ('fam', 'dev'), ('fam', 'sam'), ('fam', 'mom')
ON CONFLICT DO NOTHING;

INSERT INTO messages (id, group_id, author_id, kind, body, loc, ts) VALUES
  ('seed-t1', 'trail',  'mara', 'text', 'who''s actually coming today?', NULL, now() - interval '48 minutes'),
  ('seed-t2', 'trail',  'you',  'text', 'me! leaving now', NULL, now() - interval '46 minutes'),
  ('seed-t3', 'trail',  'dev',  'text', 'same, 10 min out', NULL, now() - interval '43 minutes'),
  ('seed-t4', 'trail',  'you',  'loc',  'meet here?', '{"label":"The Fountain","meta":"0.4 mi · 6 min walk"}'::jsonb, now() - interval '38 minutes'),
  ('seed-t5', 'trail',  'mara', 'text', 'perfect 👌', NULL, now() - interval '36 minutes'),
  ('seed-c1', 'climb',  'sam',  'loc',  'shared a location', '{"label":"Boulder Field","meta":"2.1 mi · trailhead lot"}'::jsonb, now() - interval '110 minutes'),
  ('seed-d1', 'dev-dm', 'dev',  'text', 'see you there', NULL, now() - interval '170 minutes'),
  ('seed-f1', 'food',   'you',  'text', 'booking a table', NULL, now() - interval '200 minutes'),
  ('seed-m1', 'fam',    'mom',  'text', 'call me when free', NULL, now() - interval '225 minutes')
ON CONFLICT (id) DO NOTHING;
