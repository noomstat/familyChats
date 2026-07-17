-- Phase X — family membership: add-from-friends. Mirrors friend_group_keys'
-- (server/db/014_friend_convos.sql) "wrap under a pairwise DH key" shape,
-- except what's wrapped here is the FAMILY's anchor key (ring[0]), not a
-- friend group's random key: the adder's device wraps it to the friend's
-- X25519 public key client-side (deriveSharedKey(adderPriv, friendPub)) —
-- `wrapped` is an opaque e2e:1: envelope (see app/src/crypto/e2ee.ts's
-- wrapKey). The server only ever checks its shape (isEnvelope, same as
-- family_key_rolls.wrapped), never its contents — the key plaintext NEVER
-- touches this table or any other server-side storage.
CREATE TABLE IF NOT EXISTS family_member_keys (
  family_id  text NOT NULL REFERENCES families (id),
  member_id  text NOT NULL REFERENCES users (id),
  wrapped    text NOT NULL,          -- e2e:1: envelope of the family anchor key
  wrapped_by text REFERENCES users (id),
  ts         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, member_id)
);
