// File-upload infrastructure — deliberately generic so Phase E (photos) and
// Phase F (voice messages) share it: one configured multer instance writing
// to server/uploads/ with uuid filenames, a 10 MB cap, and an image+audio
// mime allowlist. No S3 in v1 (see the plan's architecture decisions).
//
// Files are served publicly at GET /uploads/<name> (see server.js). Public
// read is acceptable for v1: filenames are crypto.randomUUID()-based and
// therefore unguessable, and nothing ever lists the directory.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

/** Absolute path of the on-disk upload directory (server/uploads/, gitignored). */
export const UPLOADS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');

// Create the directory on boot if missing — multer's diskStorage won't.
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// Images (Phase E photos) + audio (Phase F voice messages). Recorders and
// browsers disagree on m4a container mimes, hence the mp4/x-m4a/aac spread.
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/aac',
  'audio/x-m4a',
  'audio/webm',
  'audio/wav',
]);

/** '.jpg' from 'IMG 0001.JPG', or '' when the extension is missing/suspicious. */
function safeExtension(originalName) {
  const ext = path.extname(originalName ?? '').slice(1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? `.${ext}` : '';
}

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => cb(null, crypto.randomUUID() + safeExtension(file.originalname)),
});

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
  const err = new Error(`unsupported file type: ${file.mimetype}`);
  err.status = 400; // flows through to the JSON error handler as a 400
  cb(err);
}

/**
 * The configured multer instance. Routes use `upload.single('file')`.
 * Size-limit violations surface as MulterError (no .status of its own) —
 * server.js's error handler maps err.name === 'MulterError' to 400.
 */
export const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_BYTES } });

/**
 * Phase Z — friend-chat attachments (photos + arbitrary files), end-to-end
 * encrypted client-side before upload: what lands on disk is XChaCha20-
 * Poly1305 ciphertext, never a real image/audio/whatever mime, so `upload`'s
 * ALLOWED_MIME allowlist (which exists to sanity-check REAL media types)
 * doesn't apply here — the client always sends `application/octet-stream`
 * and there is deliberately no fileFilter. Same disk storage + 10 MB cap +
 * uuid filenames as `upload`; a separate multer instance only so `upload`
 * itself (and its allowlist, relied on by voice/album/receipt uploads)
 * stays untouched.
 */
export const uploadEncrypted = multer({ storage, limits: { fileSize: MAX_FILE_BYTES } });
