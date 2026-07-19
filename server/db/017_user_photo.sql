-- Profile photos: a user may set a photo shown wherever they appear (chat
-- list, threads, friends, family member lists, You screen). NOT E2EE — a
-- public identity image, stored plaintext like album photos/receipts, at
-- '/uploads/<uuid>' (see server/src/uploads.js's `upload` instance).
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url text;
