-- Phase K/M: family shared-key end-to-end encryption. The server never holds
-- the key — this flag only gates whether a family's clients are expected to
-- send encrypted envelopes; enforcement lives in src/chat.js's createMessage.
-- Phase M: E2EE is mandatory for every family (no opt-in, no disable) —
-- default flipped to true and createFamily() always sets it explicitly.
ALTER TABLE families ADD COLUMN IF NOT EXISTS e2ee boolean NOT NULL DEFAULT true;
