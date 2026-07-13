-- Shared Calendar (#2). Same client-generated-id + ON CONFLICT DO NOTHING
-- idempotency pattern as chat/lists (003/004).

CREATE TABLE IF NOT EXISTS events (
  id         text PRIMARY KEY,
  family_id  text NOT NULL REFERENCES families (id),
  title      text NOT NULL,
  notes      text,
  start_ts   timestamptz NOT NULL,
  end_ts     timestamptz,
  all_day    boolean NOT NULL DEFAULT false,
  created_by text REFERENCES users (id),
  ts         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_family_start_idx ON events (family_id, start_ts);
