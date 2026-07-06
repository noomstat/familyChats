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

// ── Realtime ─────────────────────────────────────────────────

/** ws(s) URL for the realtime hub, carrying the session token as a query param. */
export function getWsUrl(token: string): string {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  return `${wsBase}${WS_PATH}?token=${encodeURIComponent(token)}`;
}
