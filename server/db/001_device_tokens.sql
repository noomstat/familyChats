-- Expo push tokens, one row per device. A user may have several devices.
CREATE TABLE IF NOT EXISTS device_tokens (
  expo_token  text PRIMARY KEY,
  user_id     text NOT NULL,
  platform    text NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON device_tokens (user_id);

-- pg-boss creates and owns its own schema ("pgboss") on first start,
-- so there is nothing else to migrate for the queue itself.
