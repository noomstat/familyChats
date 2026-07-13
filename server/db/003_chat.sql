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
