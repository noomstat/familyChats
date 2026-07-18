-- Phase Z — encrypted photo & file sharing in friend chat. Messages of
-- kind='file' carry an e2e:1: envelope body (metadata: name/mime/size/nonce)
-- and a media_path pointing at the ciphertext blob on disk (uploaded via
-- uploadEncrypted — see src/uploads.js). This just widens the existing
-- messages_kind_check CHECK constraint (confirmed via pg_constraint: the
-- real name is `messages_kind_check`, defined in 003_chat.sql) to allow
-- 'file' alongside 'text'/'loc'/'voice'. Idempotent: DROP...IF EXISTS then
-- re-ADD, safe to re-run.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind_check;
ALTER TABLE messages ADD CONSTRAINT messages_kind_check CHECK (kind IN ('text', 'loc', 'voice', 'file'));
