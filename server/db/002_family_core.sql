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

-- Demo seed: 5 users (password "family123" for all) + one family "The Nows".
-- Hash below is bcryptjs.hash('family123', 10) — generated once, reused for
-- every seed user (verified with bcryptjs.compare before committing this file).
INSERT INTO users (id, username, name, password_hash) VALUES
  ('you',  'you',  'You Now',  '$2b$10$57vFr36psNb0Tc5mbR3UEuMYd06msOzyVD2LK1R1QNSGfHty.W2Ca'),
  ('mara', 'mara', 'Mara Ito', '$2b$10$57vFr36psNb0Tc5mbR3UEuMYd06msOzyVD2LK1R1QNSGfHty.W2Ca'),
  ('dev',  'dev',  'Dev Kaur', '$2b$10$57vFr36psNb0Tc5mbR3UEuMYd06msOzyVD2LK1R1QNSGfHty.W2Ca'),
  ('sam',  'sam',  'Sam Ng',   '$2b$10$57vFr36psNb0Tc5mbR3UEuMYd06msOzyVD2LK1R1QNSGfHty.W2Ca'),
  ('mom',  'mom',  'Mom',      '$2b$10$57vFr36psNb0Tc5mbR3UEuMYd06msOzyVD2LK1R1QNSGfHty.W2Ca')
ON CONFLICT (id) DO NOTHING;

INSERT INTO families (id, name, invite_code, created_by) VALUES
  ('fam-nows', 'The Nows', 'FAM123', 'you')
ON CONFLICT (id) DO NOTHING;

INSERT INTO family_members (family_id, user_id, role) VALUES
  ('fam-nows', 'you',  'owner'),
  ('fam-nows', 'mara', 'member'),
  ('fam-nows', 'dev',  'member'),
  ('fam-nows', 'sam',  'member'),
  ('fam-nows', 'mom',  'member')
ON CONFLICT (family_id, user_id) DO NOTHING;
