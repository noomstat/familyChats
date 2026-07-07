// Thin fetch wrapper for the FamilyChats server (server/). Owns the base URL
// (moved here from notifications/registerPushToken.ts, which now imports it
// back) and Bearer-token injection. All request/response typing for the
// auth + Family Space endpoints added in Phase A lives here too.

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
  serverTime: string;
}

export interface SyncResponse {
  messages: ServerMessage[];
  reads: { groupId: string; userId: string; lastReadTs: string }[];
  grocery: ServerGroceryItem[];
  tasks: ServerTask[];
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

// ── Realtime ─────────────────────────────────────────────────

/** ws(s) URL for the realtime hub, carrying the session token as a query param. */
export function getWsUrl(token: string): string {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  return `${wsBase}${WS_PATH}?token=${encodeURIComponent(token)}`;
}
