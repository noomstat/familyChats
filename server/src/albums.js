// Shared Photo Albums (#5). Same CRUD+realtime pattern as events.js/lists.js:
// every function is membership-checked — the caller (actor) must be a member
// of the family that owns the row, or a fresh 404 for an unknown id / 403 for
// someone else's family's row.
//
// Read-vs-write asymmetry, same as lists.js: listAlbums degrades to an empty
// array for a family-less user; createAlbum (which needs somewhere to attach
// the new row) throws 409 'not in a family' instead.
//
// Photo files live on disk in server/uploads/ (see uploads.js); a photo row's
// file_path is the public URL path ('/uploads/<uuid>.<ext>'). Deleting a
// photo/album also unlinks its file(s) — best-effort: a missing file is not
// an error, the row is the source of truth.
import fs from 'node:fs/promises';
import path from 'node:path';
import { query } from './db.js';
import { broadcastToFamily } from './ws.js';
import { UPLOADS_DIR } from './uploads.js';
import { getActiveFamilyId } from './requestContext.js';

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function forbidden(message) {
  const err = new Error(message);
  err.status = 403;
  return err;
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  return err;
}

// Phase S — see lists.js's copy of this helper for the request-context rationale.
async function userFamilyId(userId) {
  const active = getActiveFamilyId();
  if (active) return active;
  const { rows } = await query('SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1', [userId]);
  return rows[0]?.family_id ?? null;
}

/** Row (+ photo_count/cover_path aggregates) -> camelCase wire shape. */
function mapAlbum(row) {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    createdBy: row.created_by,
    ts: row.ts.toISOString(),
    photoCount: row.photo_count ?? 0,
    coverPath: row.cover_path ?? null,
  };
}

function mapPhoto(row) {
  return {
    id: row.id,
    albumId: row.album_id,
    familyId: row.family_id,
    uploaderId: row.uploader_id,
    filePath: row.file_path,
    caption: row.caption,
    w: row.w,
    h: row.h,
    ts: row.ts.toISOString(),
  };
}

/** Best-effort unlink of an uploaded file by its '/uploads/<name>' path. */
async function unlinkUpload(filePath) {
  const name = path.basename(filePath ?? '');
  if (!name) return;
  await fs.unlink(path.join(UPLOADS_DIR, name)).catch(() => {});
}

const ALBUM_AGGREGATES = `
  (SELECT count(*)::int FROM photos p WHERE p.album_id = a.id) AS photo_count,
  (SELECT p.file_path FROM photos p WHERE p.album_id = a.id ORDER BY p.ts DESC, p.id DESC LIMIT 1) AS cover_path`;

/** One album with its photoCount/coverPath aggregates, by id (no access check). */
async function albumShape(id) {
  const { rows } = await query(`SELECT a.*, ${ALBUM_AGGREGATES} FROM albums a WHERE a.id = $1`, [id]);
  return rows[0] ? mapAlbum(rows[0]) : null;
}

async function assertAlbumAccess(id, userId) {
  const { rows } = await query('SELECT * FROM albums WHERE id = $1', [id]);
  const album = rows[0];
  if (!album) throw notFound('album not found');
  const familyId = await userFamilyId(userId);
  if (!familyId || album.family_id !== familyId) throw forbidden('not a member of this family');
  return album;
}

async function assertPhotoAccess(id, userId) {
  const { rows } = await query('SELECT * FROM photos WHERE id = $1', [id]);
  const photo = rows[0];
  if (!photo) throw notFound('photo not found');
  const familyId = await userFamilyId(userId);
  if (!familyId || photo.family_id !== familyId) throw forbidden('not a member of this family');
  return photo;
}

// ── Albums ───────────────────────────────────────────────────

/** My family's albums (creation order), each with photoCount + coverPath (latest photo, or null). */
export async function listAlbums(userId) {
  const familyId = await userFamilyId(userId);
  if (!familyId) return [];
  const { rows } = await query(
    `SELECT a.*, ${ALBUM_AGGREGATES} FROM albums a WHERE a.family_id = $1 ORDER BY a.ts ASC`,
    [familyId],
  );
  return rows.map(mapAlbum);
}

/** Insert an album (idempotent on `id`). Broadcasts `album`/`upsert` on a fresh insert. */
export async function createAlbum({ id, name, userId }) {
  if (!id) throw badRequest('id is required');
  if (typeof name !== 'string' || !name.trim()) throw badRequest('name is required');

  const familyId = await userFamilyId(userId);
  if (!familyId) throw conflict('not in a family');

  const { rows } = await query(
    `INSERT INTO albums (id, family_id, name, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [id, familyId, name.trim(), userId],
  );

  if (!rows[0]) return albumShape(id); // duplicate/retry — return as-is, no re-broadcast

  const album = mapAlbum(rows[0]); // fresh insert: photoCount 0, coverPath null
  await broadcastToFamily(familyId, { type: 'album', action: 'upsert', album });
  return album;
}

export async function renameAlbum({ id, name, userId }) {
  const existing = await assertAlbumAccess(id, userId);
  if (typeof name !== 'string' || !name.trim()) throw badRequest('name is required');

  await query('UPDATE albums SET name = $1 WHERE id = $2', [name.trim(), id]);
  const album = await albumShape(id);
  await broadcastToFamily(existing.family_id, { type: 'album', action: 'upsert', album });
  return album;
}

/** Deletes an album, its photo rows, and (best-effort) their files on disk. */
export async function removeAlbum({ id, userId }) {
  const album = await assertAlbumAccess(id, userId);

  const { rows: photoRows } = await query('DELETE FROM photos WHERE album_id = $1 RETURNING file_path', [id]);
  await query('DELETE FROM albums WHERE id = $1', [id]);
  for (const row of photoRows) await unlinkUpload(row.file_path);

  await broadcastToFamily(album.family_id, { type: 'album', action: 'remove', id });
  return { id };
}

// ── Photos ───────────────────────────────────────────────────

/** An album's photos, ascending by ts. Membership-checked via the album's family. */
export async function listPhotos(albumId, userId) {
  await assertAlbumAccess(albumId, userId);
  const { rows } = await query('SELECT * FROM photos WHERE album_id = $1 ORDER BY ts ASC', [albumId]);
  return rows.map(mapPhoto);
}

/**
 * Insert a photo row for an already-uploaded file (idempotent on `id`).
 * Broadcasts `photo`/`upsert` on a fresh insert — clients bump the album's
 * photoCount/coverPath locally rather than the server re-broadcasting the album.
 */
export async function addPhoto({ id, albumId, userId, filePath, caption, w, h }) {
  if (!id) throw badRequest('id is required');
  if (!filePath) throw badRequest('filePath is required');
  const album = await assertAlbumAccess(albumId, userId);

  const width = w == null || w === '' ? null : Number(w);
  const height = h == null || h === '' ? null : Number(h);
  if (width !== null && !Number.isFinite(width)) throw badRequest('w must be a number');
  if (height !== null && !Number.isFinite(height)) throw badRequest('h must be a number');

  const { rows } = await query(
    `INSERT INTO photos (id, album_id, family_id, uploader_id, file_path, caption, w, h)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [id, albumId, album.family_id, userId, filePath, caption?.trim() || null, width, height],
  );

  if (!rows[0]) {
    const { rows: existing } = await query('SELECT * FROM photos WHERE id = $1', [id]);
    return existing[0] ? mapPhoto(existing[0]) : null;
  }

  const photo = mapPhoto(rows[0]);
  await broadcastToFamily(album.family_id, { type: 'photo', action: 'upsert', photo });
  return photo;
}

/** Deletes a photo row and (best-effort) its file on disk. */
export async function removePhoto({ id, userId }) {
  const photo = await assertPhotoAccess(id, userId);

  await query('DELETE FROM photos WHERE id = $1', [id]);
  await unlinkUpload(photo.file_path);

  await broadcastToFamily(photo.family_id, { type: 'photo', action: 'remove', id, albumId: photo.album_id });
  return { id, albumId: photo.album_id };
}
