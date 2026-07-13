// Thin fetch wrapper for the FamilyChats server (server/). Owns the base URL
// (moved here from notifications/registerPushToken.ts, which now imports it
// back) and Bearer-token injection. All request/response typing for the
// auth + Family Space endpoints added in Phase A lives here too.
import { Platform } from 'react-native';

// Base URL of the FamilyChats API. Override per-environment with an
// EXPO_PUBLIC_API_BASE_URL env var (Expo exposes EXPO_PUBLIC_* to the client).
// NOTE: a physical device can't reach "localhost" on your dev machine — use the
// machine's LAN IP there, e.g. EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:3002
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3002';

const WS_PATH = '/ws';

export interface ApiUser {
  id: string;
  username: string;
  name: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  username: string;
  role: 'owner' | 'member';
}

export interface FamilyInfo {
  family: {
    id: string;
    name: string;
    inviteCode: string;
    role: 'owner' | 'member';
    /** Phase K — true once the owner has turned on end-to-end encryption. One-way (no disable). */
    e2ee: boolean;
  };
  members: FamilyMember[];
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  body?: unknown;
  token?: string | null;
}

/**
 * Call the FamilyChats API. Injects `Authorization: Bearer <token>` when a
 * token is given, JSON-encodes `body`, and throws an `Error` carrying the
 * server's `{ error }` message (or the status text) on any non-2xx response.
 */
export async function api<T>(path: string, { method = 'GET', body, token }: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message = (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string')
      ? data.error
      : res.statusText || `request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

// ── Auth ─────────────────────────────────────────────────────

export function authRegister(input: { id?: string; username: string; password: string; name: string }) {
  return api<{ user: ApiUser }>('/auth/register', { method: 'POST', body: input });
}

export function authLogin(input: { username: string; password: string }) {
  return api<{ token: string; user: ApiUser }>('/auth/login', { method: 'POST', body: input });
}

export function authLogout(token: string) {
  return api<void>('/auth/logout', { method: 'POST', token });
}

export function getMe(token: string) {
  return api<{ user: ApiUser; family: FamilyInfo | null }>('/me', { token });
}

// ── Family Space ─────────────────────────────────────────────

export function createFamily(token: string, name: string) {
  return api<FamilyInfo>('/families', { method: 'POST', body: { name }, token });
}

export function joinFamily(token: string, code: string) {
  return api<FamilyInfo>('/families/join', { method: 'POST', body: { code }, token });
}

export function regenerateFamilyCode(token: string) {
  return api<FamilyInfo>('/families/regenerate-code', { method: 'POST', token });
}

export function getFamilyMembers(token: string) {
  return api<{ members: FamilyMember[] }>('/families/members', { token });
}

// ── Phase N: E2EE key rotation ──────────────────────────────

export interface KeyRoll {
  id: string;
  familyId: string;
  /** e2e:1: envelope: the new family key, encrypted under the previous active key. */
  wrapped: string;
  createdBy: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** `wrapped` comes from wrapKey() in ../crypto/e2ee.ts — the server only checks its shape, never its contents. */
export function postKeyRoll(token: string, familyId: string, wrapped: string) {
  return api<{ roll: KeyRoll }>(`/families/${familyId}/key-rolls`, { method: 'POST', body: { wrapped }, token });
}

// ── Family Chat ──────────────────────────────────────────────

export interface ServerLoc {
  label: string;
  meta?: string;
  live?: boolean;
}

export interface ServerMessage {
  id: string;
  groupId: string;
  authorId: string;
  kind: 'text' | 'loc' | 'voice';
  body: string | null;
  loc: ServerLoc | null;
  mediaPath: string | null;
  durationMs: number | null;
  /** ISO 8601 timestamp. */
  ts: string;
}

export interface ServerGroup {
  id: string;
  familyId: string;
  name: string;
  /** User ids. */
  members: string[];
}

export interface BootstrapGroup extends ServerGroup {
  /** Last ~30 messages, ascending by ts. */
  latest: ServerMessage[];
  unread: number;
  lastReadTs: string | null;
  /** Every member's read cursor (ISO), keyed by user id. */
  cursors: Record<string, string>;
}

export interface BootstrapResponse {
  groups: BootstrapGroup[];
  grocery: ServerGroceryItem[];
  tasks: ServerTask[];
  events: ServerEvent[];
  /** Album metadata only — photos are fetched lazily per album (getAlbumPhotos). */
  albums: ServerAlbum[];
  expenses: ServerExpense[];
  transfers: ServerTransfer[];
  /** The family's current-month budget, or null if never set. */
  budget: ServerBudget | null;
  /** Phase N — every key roll this family has produced, oldest first. A cold client fixpoint-replays these from its anchor key to rebuild the full ring (see AppStore.tsx's key-load effect). */
  keyRolls: KeyRoll[];
  /** Phase P — E2EE shared notes, full current list (family-scale, like grocery/tasks/events). */
  notes: ServerNote[];
  serverTime: string;
}

export interface SyncResponse {
  messages: ServerMessage[];
  reads: { groupId: string; userId: string; lastReadTs: string }[];
  /** Phase N — key rolls created since `after`, so a member who was offline through a rotation catches up on reconnect (see AppStore.tsx's applyIncomingKeyRolls). */
  keyRolls: KeyRoll[];
  grocery: ServerGroceryItem[];
  tasks: ServerTask[];
  events: ServerEvent[];
  /** Full current list, like grocery/tasks/events (photos are NOT synced — refetch per album). */
  albums: ServerAlbum[];
  /** Full current list, like grocery/tasks/events. */
  expenses: ServerExpense[];
  transfers: ServerTransfer[];
  budget: ServerBudget | null;
  /** Full current list, like grocery/tasks/events. */
  notes: ServerNote[];
  serverTime: string;
}

export function getBootstrap(token: string) {
  return api<BootstrapResponse>('/bootstrap', { token });
}

export function getSync(token: string, after: string) {
  return api<SyncResponse>(`/sync?after=${encodeURIComponent(after)}`, { token });
}

export function getGroupMessages(token: string, groupId: string, opts: { before?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.before) params.set('before', opts.before);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return api<{ messages: ServerMessage[] }>(`/groups/${groupId}/messages${qs ? `?${qs}` : ''}`, { token });
}

export function postMessage(
  token: string,
  groupId: string,
  input: { id: string; kind?: 'text' | 'loc' | 'voice'; body?: string; loc?: ServerLoc; live?: boolean },
) {
  return api<{ message: ServerMessage }>(`/groups/${groupId}/messages`, { method: 'POST', body: input, token });
}

export function postRead(token: string, groupId: string, ts: string) {
  return api<{ lastReadTs: string }>(`/groups/${groupId}/read`, { method: 'POST', body: { ts }, token });
}

export function createGroup(token: string, input: { id?: string; name: string; memberIds: string[] }) {
  return api<{ group: ServerGroup }>('/groups', { method: 'POST', body: input, token });
}

export function renameGroup(token: string, groupId: string, name: string) {
  return api<{ group: ServerGroup }>(`/groups/${groupId}`, { method: 'PATCH', body: { name }, token });
}

export function addGroupMember(token: string, groupId: string, userId: string) {
  return api<{ group: ServerGroup }>(`/groups/${groupId}/members`, { method: 'POST', body: { userId }, token });
}

export function removeGroupMember(token: string, groupId: string, userId: string) {
  return api<{ group: ServerGroup }>(`/groups/${groupId}/members/${userId}`, { method: 'DELETE', token });
}

// ── Shared Grocery List ──────────────────────────────────────

export interface ServerGroceryItem {
  id: string;
  familyId: string;
  label: string;
  qty: string | null;
  checkedBy: string | null;
  /** ISO 8601 timestamp, or null while unchecked. */
  checkedAt: string | null;
  createdBy: string | null;
  /** ISO 8601 timestamp. */
  ts: string;
}

export function getGrocery(token: string) {
  return api<{ items: ServerGroceryItem[] }>('/grocery', { token });
}

export function addGroceryItem(token: string, input: { id: string; label: string; qty?: string }) {
  return api<{ item: ServerGroceryItem }>('/grocery', { method: 'POST', body: input, token });
}

export function toggleGroceryItem(token: string, id: string) {
  return api<{ item: ServerGroceryItem }>(`/grocery/${id}/toggle`, { method: 'POST', token });
}

export function removeGroceryItem(token: string, id: string) {
  return api<{ id: string }>(`/grocery/${id}`, { method: 'DELETE', token });
}

export function clearCheckedGrocery(token: string) {
  return api<{ ids: string[] }>('/grocery/clear-checked', { method: 'POST', token });
}

// ── Shared Tasks ─────────────────────────────────────────────

export interface ServerTask {
  id: string;
  familyId: string;
  title: string;
  notes: string | null;
  assigneeId: string | null;
  /** 'YYYY-MM-DD', or null if no due date. */
  dueDate: string | null;
  done: boolean;
  doneBy: string | null;
  /** ISO 8601 timestamp, or null while open. */
  doneAt: string | null;
  createdBy: string | null;
  /** ISO 8601 timestamp. */
  ts: string;
}

export interface TaskPatch {
  title?: string;
  notes?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export function getTasks(token: string) {
  return api<{ tasks: ServerTask[] }>('/tasks', { token });
}

export function addTaskItem(token: string, input: { id: string; title: string; notes?: string; assigneeId?: string; dueDate?: string }) {
  return api<{ task: ServerTask }>('/tasks', { method: 'POST', body: input, token });
}

export function updateTaskItem(token: string, id: string, patch: TaskPatch) {
  return api<{ task: ServerTask }>(`/tasks/${id}`, { method: 'PATCH', body: patch, token });
}

export function toggleTaskItem(token: string, id: string) {
  return api<{ task: ServerTask }>(`/tasks/${id}/toggle`, { method: 'POST', token });
}

export function removeTaskItem(token: string, id: string) {
  return api<{ id: string }>(`/tasks/${id}`, { method: 'DELETE', token });
}

// ── Shared Calendar ──────────────────────────────────────────

export interface ServerEvent {
  id: string;
  familyId: string;
  title: string;
  notes: string | null;
  /** ISO 8601 timestamp. */
  startTs: string;
  /** ISO 8601 timestamp, or null for a point-in-time event. */
  endTs: string | null;
  allDay: boolean;
  createdBy: string | null;
  /** ISO 8601 timestamp. */
  ts: string;
}

export interface EventPatch {
  title?: string;
  notes?: string | null;
  startTs?: string;
  endTs?: string | null;
  allDay?: boolean;
}

/** `from`/`to` are ISO timestamps; omit either to leave that side of the range open. */
export function getEvents(token: string, opts: { from?: string; to?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.from) params.set('from', opts.from);
  if (opts.to) params.set('to', opts.to);
  const qs = params.toString();
  return api<{ events: ServerEvent[] }>(`/events${qs ? `?${qs}` : ''}`, { token });
}

export function addEventItem(
  token: string,
  input: { id: string; title: string; notes?: string; startTs: string; endTs?: string; allDay?: boolean },
) {
  return api<{ event: ServerEvent }>('/events', { method: 'POST', body: input, token });
}

export function updateEventItem(token: string, id: string, patch: EventPatch) {
  return api<{ event: ServerEvent }>(`/events/${id}`, { method: 'PATCH', body: patch, token });
}

export function removeEventItem(token: string, id: string) {
  return api<{ id: string }>(`/events/${id}`, { method: 'DELETE', token });
}

// ── Shared Notes (Phase P — E2EE) ─────────────────────────────
//
// Server-blind: `cipher` is an opaque e2e:1: envelope of `{note:{title,body}}`
// (see app/src/crypto/e2ee.ts). The server only checks its shape, never its
// contents — encrypt/decrypt happen entirely client-side (see AppStore.tsx's
// fromServerNote).

export interface ServerNote {
  id: string;
  familyId: string;
  cipher: string;
  createdBy: string | null;
  /** ISO 8601 timestamp. */
  updatedAt: string;
  /** ISO 8601 timestamp. */
  ts: string;
}

export function getNotes(token: string) {
  return api<{ notes: ServerNote[] }>('/notes', { token });
}

export function addNote(token: string, input: { id: string; cipher: string }) {
  return api<{ note: ServerNote }>('/notes', { method: 'POST', body: input, token });
}

export function updateNote(token: string, id: string, cipher: string) {
  return api<{ note: ServerNote }>(`/notes/${id}`, { method: 'PATCH', body: { cipher }, token });
}

export function removeNote(token: string, id: string) {
  return api<{ id: string }>(`/notes/${id}`, { method: 'DELETE', token });
}

// ── Shared Photo Albums + file uploads ───────────────────────

export interface ServerAlbum {
  id: string;
  familyId: string;
  name: string;
  createdBy: string | null;
  /** ISO 8601 timestamp. */
  ts: string;
  photoCount: number;
  /** file_path of the album's latest photo ('/uploads/…'), or null while empty. */
  coverPath: string | null;
}

export interface ServerPhoto {
  id: string;
  albumId: string;
  familyId: string;
  uploaderId: string | null;
  /** Public URL path ('/uploads/<uuid>.<ext>') — absolute URL via fileUrl(). */
  filePath: string;
  caption: string | null;
  w: number | null;
  h: number | null;
  /** ISO 8601 timestamp. */
  ts: string;
}

/** Absolute URL for a server file path like '/uploads/<name>'. */
export function fileUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/** A local file to upload, as handed back by a picker (photos) or recorder (voice). */
export interface UploadFile {
  /** file:// on native; blob:/data: on web. */
  uri: string;
  name: string;
  mimeType: string;
}

/**
 * POST a file (+ optional extra text fields) as multipart/form-data under the
 * field name `file`. Generic across media kinds — Phase E photos and Phase F
 * voice messages both go through here.
 *
 * The fiddly part is the file value: React Native's FormData accepts a
 * `{ uri, name, type }` descriptor, but on web the picker hands back a
 * blob:/data: URI that must be fetched into a real Blob first.
 */
export async function uploadFile<T>(
  token: string,
  path: string,
  file: UploadFile,
  fields: Record<string, string | undefined> = {},
): Promise<T> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const raw = await (await fetch(file.uri)).blob();
    // Some blob:/data: fetches come back untyped — retag so the server's mime allowlist sees the real type.
    const blob = raw.type ? raw : new Blob([raw], { type: file.mimeType });
    form.append('file', blob, file.name);
  } else {
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  }
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, value);
  }

  // No explicit Content-Type — fetch must set the multipart boundary itself.
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const message = (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string')
      ? data.error
      : res.statusText || `upload failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export function getAlbums(token: string) {
  return api<{ albums: ServerAlbum[] }>('/albums', { token });
}

export function createAlbumItem(token: string, input: { id: string; name: string }) {
  return api<{ album: ServerAlbum }>('/albums', { method: 'POST', body: input, token });
}

export function renameAlbumItem(token: string, id: string, name: string) {
  return api<{ album: ServerAlbum }>(`/albums/${id}`, { method: 'PATCH', body: { name }, token });
}

export function removeAlbumItem(token: string, id: string) {
  return api<{ id: string }>(`/albums/${id}`, { method: 'DELETE', token });
}

export function getAlbumPhotos(token: string, albumId: string) {
  return api<{ photos: ServerPhoto[] }>(`/albums/${albumId}/photos`, { token });
}

/** Multipart upload of one photo into an album. Caption/dimensions ride along as text fields. */
export function uploadPhoto(
  token: string,
  albumId: string,
  input: UploadFile & { id?: string; caption?: string; w?: number; h?: number },
) {
  const { uri, name, mimeType, id, caption, w, h } = input;
  return uploadFile<{ photo: ServerPhoto }>(token, `/albums/${albumId}/photos`, { uri, name, mimeType }, {
    id,
    caption,
    w: w != null ? String(w) : undefined,
    h: h != null ? String(h) : undefined,
  });
}

export function removePhotoItem(token: string, id: string) {
  return api<{ id: string; albumId: string }>(`/photos/${id}`, { method: 'DELETE', token });
}

// ── Family Finance (Phase I) ──────────────────────────────────

export type CategoryId = 'food' | 'stay' | 'trans' | 'gear' | 'refund';

export interface ServerExpense {
  id: string;
  familyId: string;
  label: string;
  categoryId: CategoryId;
  amount: number;
  paidBy: string;
  /** User ids. */
  splitAmong: string[];
  /** '/uploads/<name>' receipt photo, or null. */
  receiptPath: string | null;
  createdBy: string | null;
  /** ISO 8601 timestamp. */
  ts: string;
}

export interface ServerTransfer {
  id: string;
  familyId: string;
  fromId: string;
  toId: string;
  amount: number;
  /** ISO 8601 timestamp. */
  ts: string;
}

export interface ServerBudget {
  /** 'YYYY-MM'. */
  month: string;
  amount: number;
}

export interface UploadReceiptResponse {
  receiptPath: string;
}

export function addExpense(
  token: string,
  input: { id: string; label: string; categoryId: CategoryId; amount: number; paidBy: string; splitAmong: string[]; receiptPath?: string },
) {
  return api<{ expense: ServerExpense }>('/expenses', { method: 'POST', body: input, token });
}

export function removeExpense(token: string, id: string) {
  return api<{ id: string }>(`/expenses/${id}`, { method: 'DELETE', token });
}

export function addTransfer(token: string, input: { id: string; toId: string; amount: number }) {
  return api<{ transfer: ServerTransfer }>('/transfers', { method: 'POST', body: input, token });
}

export function putBudget(token: string, input: { month?: string; amount: number }) {
  return api<{ budget: ServerBudget }>('/budget', { method: 'PUT', body: input, token });
}

export function remindPayment(token: string, input: { toUserId: string; amount: number }) {
  return api<{ ok: true }>('/finance/remind', { method: 'POST', body: input, token });
}

/** Multipart upload of a receipt photo — stores it and returns its path for manual expense entry. */
export function uploadReceipt(token: string, file: UploadFile) {
  return uploadFile<UploadReceiptResponse>(token, '/finance/scan-receipt', file);
}

// ── Voice messages (Phase F) ─────────────────────────────────

/** Multipart upload of one recorded clip as a group message. Client id + duration ride along as text fields. */
export function uploadVoice(
  token: string,
  groupId: string,
  input: UploadFile & { id: string; durationMs?: number },
) {
  const { uri, name, mimeType, id, durationMs } = input;
  return uploadFile<{ message: ServerMessage }>(token, `/groups/${groupId}/voice`, { uri, name, mimeType }, {
    id,
    durationMs: durationMs != null ? String(durationMs) : undefined,
  });
}

// ── Memory Timeline (Phase H) ─────────────────────────────────

export type TimelineItem =
  | {
      type: 'photo';
      id: string;
      /** ISO 8601 timestamp. */
      ts: string;
      filePath: string;
      caption: string | null;
      uploaderName: string | null;
      albumId: string;
      albumName: string;
    }
  | {
      type: 'event';
      id: string;
      /** ISO 8601 timestamp (== startTs). */
      ts: string;
      title: string;
      allDay: boolean;
      startTs: string;
    }
  | {
      type: 'milestone';
      id: string;
      /** ISO 8601 timestamp. */
      ts: string;
      text: string;
    };

export interface TimelineMonth {
  /** 'YYYY-MM'. */
  month: string;
  /** e.g. 'July 2026'. */
  label: string;
  items: TimelineItem[];
}

export interface TimelineResponse {
  months: TimelineMonth[];
  serverTime: string;
}

/** Not part of bootstrap/sync — fetched on-demand when the Memories screen opens (see server/src/timeline.js). */
export function getTimeline(token: string) {
  return api<TimelineResponse>('/timeline', { token });
}

// ── Realtime ─────────────────────────────────────────────────

/** ws(s) URL for the realtime hub, carrying the session token as a query param. */
export function getWsUrl(token: string): string {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  return `${wsBase}${WS_PATH}?token=${encodeURIComponent(token)}`;
}
