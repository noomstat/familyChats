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

-- Demo seed: family "The Nows" (fam-nows), 3 events spread around the current
-- month, computed relative to now() so the seed stays "current" whenever it's
-- (re-)applied.
INSERT INTO events (id, family_id, title, notes, start_ts, end_ts, all_day, created_by, ts) VALUES
  ('seed-event-1', 'fam-nows', 'Family dinner', NULL,
    date_trunc('day', now()) + interval '2 days' + interval '18 hours 30 minutes',
    date_trunc('day', now()) + interval '2 days' + interval '20 hours 30 minutes',
    false, 'mara', now() - interval '1 day'),
  ('seed-event-2', 'fam-nows', 'Dentist — kids', 'Bring insurance card',
    date_trunc('day', now()) + interval '6 days' + interval '9 hours',
    date_trunc('day', now()) + interval '6 days' + interval '10 hours',
    false, 'you', now() - interval '2 days'),
  ('seed-event-3', 'fam-nows', 'Cabin weekend', NULL,
    date_trunc('day', now()) + interval '12 days',
    date_trunc('day', now()) + interval '14 days',
    true, 'you', now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;
