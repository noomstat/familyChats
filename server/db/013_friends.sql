-- Phase U — Friends foundation: per-user X25519 identity keys + friendships.
-- Family-independent (no family_id anywhere here) — a friendship is between
-- two users regardless of which family/families either belongs to.
--
-- user_keys: one row per user who has ever published a public key. The
-- server only ever stores the PUBLIC half (see server/src/friends.js's
-- publishKey) — the private key lives solely in the client's SecureStore
-- (app/src/store/identityKeyStorage.ts) and never crosses the wire.
-- friend_token is a random, unguessable value shown only inside that user's
-- own QR code (app/src/crypto/friends.ts's buildFriendCode) — connectByQr
-- requires the caller to present the target's current token, so only
-- someone who actually saw the QR (or was told the code) can form a
-- friendship, not anyone who merely knows the target's user id.
CREATE TABLE IF NOT EXISTS user_keys (
  user_id      text PRIMARY KEY REFERENCES users (id),
  public_key   text NOT NULL,
  friend_token text NOT NULL,
  ts           timestamptz NOT NULL DEFAULT now()
);

-- friendships: stored as two directed rows per connection (A->B and B->A —
-- see connectByQr), so "my friends" is always a simple WHERE user_id = $1
-- scan, same shape as family_members.
CREATE TABLE IF NOT EXISTS friendships (
  user_id    text NOT NULL REFERENCES users (id),
  friend_id  text NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS friendships_user_idx ON friendships (user_id);
