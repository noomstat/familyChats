-- Auth + Family Space core: users, sessions, families, family_members.
-- Tenancy unit is the "family" — every future domain table carries a
-- family_id and every query is membership-checked (see src/family.js).

CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  username      text UNIQUE NOT NULL,
  name          text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token      text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS families (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  created_by  text REFERENCES users (id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS family_members (
  family_id text NOT NULL REFERENCES families (id),
  user_id   text NOT NULL REFERENCES users (id),
  role      text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, user_id)
);

CREATE INDEX IF NOT EXISTS family_members_user_id_idx ON family_members (user_id);
