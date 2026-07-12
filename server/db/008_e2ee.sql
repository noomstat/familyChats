-- Phase K: family shared-key end-to-end encryption. The server never holds
-- the key — this flag only gates whether a family's clients are expected to
-- send encrypted envelopes; enforcement lives in src/chat.js's createMessage.
-- One-way in v1 (no "disable e2ee" — see family.js's setE2EE comment).
ALTER TABLE families ADD COLUMN IF NOT EXISTS e2ee boolean NOT NULL DEFAULT false;
