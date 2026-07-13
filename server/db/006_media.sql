-- Shared Photo Albums (#5) + file-upload infrastructure. Same
-- client-generated-id + ON CONFLICT DO NOTHING idempotency pattern as 003-005.
-- photos.file_path is the public URL path ('/uploads/<uuid>.<ext>') of a file
-- on the API server's disk (server/uploads/, gitignored) — no S3 in v1.

CREATE TABLE IF NOT EXISTS albums (
  id         text PRIMARY KEY,
  family_id  text NOT NULL REFERENCES families (id),
  name       text NOT NULL,
  created_by text REFERENCES users (id),
  ts         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS albums_family_ts_idx ON albums (family_id, ts);

CREATE TABLE IF NOT EXISTS photos (
  id          text PRIMARY KEY,
  album_id    text NOT NULL REFERENCES albums (id),
  family_id   text NOT NULL REFERENCES families (id),
  uploader_id text REFERENCES users (id),
  file_path   text NOT NULL,
  caption     text,
  w           int,
  h           int,
  ts          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS photos_album_ts_idx ON photos (album_id, ts);
CREATE INDEX IF NOT EXISTS photos_family_ts_idx ON photos (family_id, ts);
