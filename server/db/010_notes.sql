-- Phase P — end-to-end encrypted shared family Notes. Title+body are
-- encrypted together into ONE e2e:1: envelope (`{note:{title,body}}`) — the
-- server stores only ciphertext and never decrypts, same as chat messages
-- (see src/notes.js's isEnvelope check on write). Client-generated ids,
-- same idempotency pattern as the rest of this schema.

CREATE TABLE IF NOT EXISTS notes (
  id         text PRIMARY KEY,
  family_id  text NOT NULL REFERENCES families (id),
  cipher     text NOT NULL,          -- e2e:1: envelope of {note:{title,body}}
  created_by text REFERENCES users (id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ts         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_family_ts_idx ON notes (family_id, ts);
