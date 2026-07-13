-- Phase N — E2EE key rotation with backward readability. A key roll is an
-- opaque wrapped-key envelope (same e2e:1: shape as a message body): the new
-- family key, encrypted under the previous active key. The server never
-- decrypts it — see src/family.js's addKeyRoll for the shape check, and
-- app/src/crypto/e2ee.ts's wrapKey/unwrapKey for what's actually inside.
-- Client-generated ids throughout, matching the rest of this schema.

CREATE TABLE IF NOT EXISTS family_key_rolls (
  id         text PRIMARY KEY,
  family_id  text NOT NULL REFERENCES families (id),
  wrapped    text NOT NULL,          -- e2e:1: envelope: enc(prevKey, {k:newKey})
  created_by text NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS family_key_rolls_family_idx
  ON family_key_rolls (family_id, created_at);
