-- Phase V — decouple chat groups from families so friend conversations (1:1
-- DMs and friend groups) can live alongside family group chats. A friend
-- conversation is a `groups` row with `family_id NULL, kind = 'friends'` —
-- `group_members`/`messages`/`read_cursors` are reused completely unchanged
-- (see server/src/chat.js's assertMember, which only ever checks
-- group_members, never family membership).
--
-- Idempotent: DROP NOT NULL on an already-nullable column is a no-op (no
-- error), ADD COLUMN IF NOT EXISTS is a no-op if it already ran, and the
-- constraint is only added if missing.
ALTER TABLE groups ALTER COLUMN family_id DROP NOT NULL;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'family';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_kind_check') THEN
    ALTER TABLE groups ADD CONSTRAINT groups_kind_check CHECK (kind IN ('family', 'friends'));
  END IF;
END $$;

-- Wrapped copies of a friend GROUP's (3+ member) random symmetric key, one
-- row per (group, member) — mirrors family_key_rolls' "wrap under a pairwise
-- key" shape (Phase N), except the wrapping key here is the X25519 DH secret
-- between the wrapper and that member (app/src/crypto/friends.ts's
-- deriveSharedKey), not a previous family key. `wrapped` is an e2e:1:
-- envelope (see app/src/crypto/e2ee.ts's wrapKey) — the server only ever
-- checks its shape, never its contents; the group key plaintext NEVER
-- touches this table or any other server-side storage. A 1:1 DM has NO rows
-- here at all — its key is pure client-side Diffie-Hellman between the two
-- members (nothing to store/transmit).
CREATE TABLE IF NOT EXISTS friend_group_keys (
  group_id   text NOT NULL REFERENCES groups (id),
  member_id  text NOT NULL REFERENCES users (id),
  wrapped    text NOT NULL,
  wrapped_by text REFERENCES users (id),
  ts         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, member_id)
);

CREATE INDEX IF NOT EXISTS friend_group_keys_member_idx ON friend_group_keys (member_id);
