import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {
  CURRENT_USER,
  Expense,
  LedgerSummary,
  LiveShare,
  Message,
  SEED_EXPENSES,
  SEED_TRANSFERS,
  timeLabel,
  Transfer,
  summarize,
} from './model';
import { tokenStorage } from './tokenStorage';
import {
  BootstrapResponse,
  EventPatch,
  FamilyInfo,
  FamilyMember,
  ServerAlbum,
  ServerEvent,
  ServerGroup,
  ServerGroceryItem,
  ServerMessage,
  ServerPhoto,
  ServerTask,
  TaskPatch,
  authLogin,
  authLogout,
  authRegister,
  addEventItem,
  addGroupMember,
  addGroceryItem,
  addTaskItem,
  clearCheckedGrocery as apiClearCheckedGrocery,
  createAlbumItem,
  createFamily as apiCreateFamily,
  createGroup as apiCreateGroup,
  getAlbumPhotos,
  getBootstrap,
  getGroupMessages,
  getMe,
  joinFamily as apiJoinFamily,
  postMessage,
  postRead,
  removeAlbumItem,
  removeEventItem,
  removeGroupMember,
  removeGroceryItem,
  removePhotoItem,
  removeTaskItem,
  renameAlbumItem,
  renameGroup as apiRenameGroup,
  toggleGroceryItem,
  toggleTaskItem,
  updateEventItem,
  updateTaskItem,
  uploadPhoto,
  uploadVoice,
} from '../api/client';

const STORAGE_KEY = 'familychats:store:v1';

// ── State ────────────────────────────────────────────────────

/** The signed-in user's session — the opaque token lives in tokenStorage, not here. */
export interface Session {
  token: string;
  userId: string;
  username: string;
  name: string;
}

export interface FamilyState {
  id: string;
  name: string;
  inviteCode: string;
  role: 'owner' | 'member';
  members: FamilyMember[];
}

function toFamilyState(info: FamilyInfo): FamilyState {
  return { id: info.family.id, name: info.family.name, inviteCode: info.family.inviteCode, role: info.family.role, members: info.members };
}

/** A server-backed chat group (dynamic — created/renamed/joined at runtime). */
export interface ChatGroup {
  id: string;
  familyId: string;
  name: string;
  /** User ids. */
  members: string[];
}

export interface AppState {
  groups: Record<string, ChatGroup>;
  messages: Record<string, Message[]>; // ascending by ts
  /** groupId -> userId -> last-read ts (ms) */
  readCursors: Record<string, Record<string, number>>;
  unread: Record<string, number>;
  /** Whether there's older history left to page in via loadEarlier(). */
  hasMore: Record<string, boolean>;
  /** ISO timestamp of the last successful bootstrap/sync — drives WS-reconnect catch-up. */
  lastSync: string | null;
  live: Record<string, LiveShare | undefined>;
  expenses: Expense[];
  transfers: Transfer[];
  /** Server-backed shared grocery list, unsorted — see useGrocery() for display order. */
  grocery: ServerGroceryItem[];
  /** Server-backed shared tasks, unsorted — see useTasks() for display order. */
  tasks: ServerTask[];
  /** Server-backed shared calendar events, unsorted — see useEvents() for display order. */
  events: ServerEvent[];
  /** Server-backed shared photo albums (metadata + photoCount/coverPath), unsorted — see useAlbums(). */
  albums: ServerAlbum[];
  /** Photos per album, ascending by ts — loaded lazily via loadPhotos(); an
   * absent key means "not loaded yet" (vs. an empty array = loaded, empty). */
  photosByAlbum: Record<string, ServerPhoto[]>;
  /** True once we've attempted to load persisted state. */
  hydrated: boolean;
  /** The signed-in user, or null when logged out. Not persisted to AsyncStorage —
   * rehydrated each launch from the secure-store token via GET /me. */
  session: Session | null;
  /** The session user's Family Space, or null until they create/join one. */
  family: FamilyState | null;
  /** True once the initial secure-store token check (and /me call) has settled. */
  sessionReady: boolean;
}

/** The persisted slice — local/offline-read demo + chat cache. Session/family
 * are re-fetched from the server each launch, never cached here. */
type Persisted = Omit<AppState, 'hydrated' | 'session' | 'family' | 'sessionReady'>;

const seedState: AppState = {
  groups: {},
  messages: {},
  readCursors: {},
  unread: {},
  hasMore: {},
  lastSync: null,
  live: {},
  expenses: SEED_EXPENSES,
  transfers: SEED_TRANSFERS,
  grocery: [],
  tasks: [],
  events: [],
  albums: [],
  photosByAlbum: {},
  hydrated: false,
  session: null,
  family: null,
  sessionReady: false,
};

// ── Server <-> store message mapping ─────────────────────────

export function fromServerMessage(sm: ServerMessage): Message {
  return {
    id: sm.id,
    groupId: sm.groupId,
    authorId: sm.authorId,
    kind: sm.kind,
    text: sm.body ?? undefined,
    loc: sm.loc ? { label: sm.loc.label, meta: sm.loc.meta } : undefined,
    live: sm.loc?.live,
    mediaPath: sm.mediaPath ?? undefined,
    durationMs: sm.durationMs ?? undefined,
    ts: Date.parse(sm.ts),
  };
}

function toChatGroup(g: ServerGroup): ChatGroup {
  return { id: g.id, familyId: g.familyId, name: g.name, members: g.members };
}

// ── Actions ──────────────────────────────────────────────────

type Action =
  | { type: 'HYDRATE'; payload: Persisted | null }
  | { type: 'BOOTSTRAP'; payload: BootstrapResponse }
  | { type: 'MERGE_MESSAGES'; messages: Message[] }
  | { type: 'MERGE_READ'; groupId: string; userId: string; ts: number }
  | { type: 'GROUP_UPSERT'; group: ChatGroup }
  | { type: 'GROUP_REMOVE'; groupId: string }
  | { type: 'PREPEND_HISTORY'; groupId: string; messages: Message[]; hasMore: boolean }
  | { type: 'SET_LAST_SYNC'; serverTime: string }
  | { type: 'MARK_READ'; groupId: string }
  | { type: 'START_LIVE'; groupId: string; expiresLabel: string }
  | { type: 'STOP_LIVE'; groupId: string }
  | { type: 'ADD_EXPENSE'; expense: Omit<Expense, 'id' | 'ts'> }
  | { type: 'SETTLE'; groupId: string; person: string }
  | { type: 'GROCERY_SET'; grocery: ServerGroceryItem[] }
  | { type: 'GROCERY_UPSERT'; item: ServerGroceryItem }
  | { type: 'GROCERY_REMOVE'; id: string }
  | { type: 'GROCERY_CLEAR_CHECKED' }
  | { type: 'TASK_SET'; tasks: ServerTask[] }
  | { type: 'TASK_UPSERT'; task: ServerTask }
  | { type: 'TASK_REMOVE'; id: string }
  | { type: 'EVENT_SET'; events: ServerEvent[] }
  | { type: 'EVENT_UPSERT'; event: ServerEvent }
  | { type: 'EVENT_REMOVE'; id: string }
  | { type: 'ALBUM_SET'; albums: ServerAlbum[] }
  | { type: 'ALBUM_UPSERT'; album: ServerAlbum }
  | { type: 'ALBUM_REMOVE'; id: string }
  | { type: 'PHOTOS_SET'; albumId: string; photos: ServerPhoto[] }
  | { type: 'PHOTO_UPSERT'; photo: ServerPhoto }
  | { type: 'PHOTO_REMOVE'; id: string; albumId: string }
  | { type: 'SET_SESSION'; session: Session | null }
  | { type: 'SET_FAMILY'; family: FamilyState | null }
  | { type: 'SESSION_READY' }
  | { type: 'LOGOUT' };

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function dropGroup(state: AppState, groupId: string): AppState {
  const { [groupId]: _g, ...groups } = state.groups;
  const { [groupId]: _m, ...messages } = state.messages;
  const { [groupId]: _u, ...unread } = state.unread;
  const { [groupId]: _r, ...readCursors } = state.readCursors;
  const { [groupId]: _h, ...hasMore } = state.hasMore;
  return { ...state, groups, messages, unread, readCursors, hasMore };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      // Merge the persisted slice only — session/family are never part of it
      // (see Persisted), so this can't clobber a session already established
      // by the token-check effect, whichever runs first.
      return action.payload
        ? { ...seedState, ...action.payload, session: state.session, family: state.family, sessionReady: state.sessionReady, hydrated: true }
        : { ...state, hydrated: true };

    case 'BOOTSTRAP': {
      const groups: Record<string, ChatGroup> = {};
      const messages: Record<string, Message[]> = {};
      const readCursors: Record<string, Record<string, number>> = {};
      const unread: Record<string, number> = {};
      const hasMore: Record<string, boolean> = {};
      for (const g of action.payload.groups) {
        groups[g.id] = { id: g.id, familyId: g.familyId, name: g.name, members: g.members };
        messages[g.id] = g.latest.map(fromServerMessage);
        const cursors: Record<string, number> = {};
        for (const [userId, iso] of Object.entries(g.cursors)) cursors[userId] = Date.parse(iso);
        readCursors[g.id] = cursors;
        unread[g.id] = g.unread;
        hasMore[g.id] = g.latest.length >= 30;
      }
      // Bootstrap carries album metadata but never photos — keep whatever
      // photo lists we've already loaded, pruning albums that no longer exist.
      const albumIds = new Set(action.payload.albums.map((a) => a.id));
      const photosByAlbum = Object.fromEntries(Object.entries(state.photosByAlbum).filter(([id]) => albumIds.has(id)));
      return {
        ...state,
        groups,
        messages,
        readCursors,
        unread,
        hasMore,
        grocery: action.payload.grocery,
        tasks: action.payload.tasks,
        events: action.payload.events,
        albums: action.payload.albums,
        photosByAlbum,
        lastSync: action.payload.serverTime,
      };
    }

    case 'MERGE_MESSAGES': {
      // Upsert by id: a brand-new id is appended (and bumps unread, if not
      // mine); a matching id is merged into the existing row in place. The
      // latter is what lets a voice message's optimistic local mediaPath
      // (a file:/blob: uri) get overwritten with the server's '/uploads/…'
      // path once the upload round-trip resolves, same `id` throughout.
      const myId = state.session?.userId;
      let messages = state.messages;
      let unread = state.unread;
      const byGroup = new Map<string, Message[]>();
      for (const m of action.messages) {
        if (!byGroup.has(m.groupId)) byGroup.set(m.groupId, []);
        byGroup.get(m.groupId)!.push(m);
      }
      for (const [groupId, incoming] of byGroup) {
        const existing = messages[groupId] ?? [];
        const indexById = new Map(existing.map((m, i) => [m.id, i]));
        let next = existing;
        let changed = false;
        let bump = 0;
        for (const m of incoming) {
          const idx = indexById.get(m.id);
          if (idx === undefined) {
            if (next === existing) next = [...existing];
            indexById.set(m.id, next.length);
            next.push(m);
            changed = true;
            if (m.authorId !== myId) bump += 1;
          } else if (next[idx] !== m) {
            if (next === existing) next = [...existing];
            next[idx] = { ...next[idx], ...m };
            changed = true;
          }
        }
        if (!changed) continue;
        messages = { ...messages, [groupId]: [...next].sort((a, b) => a.ts - b.ts) };
        if (bump) unread = { ...unread, [groupId]: (unread[groupId] ?? 0) + bump };
      }
      return { ...state, messages, unread };
    }

    case 'MERGE_READ': {
      const cur = state.readCursors[action.groupId] ?? {};
      const existingTs = cur[action.userId] ?? 0;
      if (action.ts <= existingTs) return state; // cursors only ever move forward
      return { ...state, readCursors: { ...state.readCursors, [action.groupId]: { ...cur, [action.userId]: action.ts } } };
    }

    case 'GROUP_UPSERT': {
      const myId = state.session?.userId;
      if (myId && !action.group.members.includes(myId)) {
        // I'm no longer a member (left or was removed) — drop it entirely.
        return dropGroup(state, action.group.id);
      }
      return { ...state, groups: { ...state.groups, [action.group.id]: action.group } };
    }

    case 'GROUP_REMOVE':
      return dropGroup(state, action.groupId);

    case 'PREPEND_HISTORY': {
      const existing = state.messages[action.groupId] ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const fresh = action.messages.filter((m) => !existingIds.has(m.id));
      const merged = [...fresh, ...existing].sort((a, b) => a.ts - b.ts);
      return {
        ...state,
        messages: { ...state.messages, [action.groupId]: merged },
        hasMore: { ...state.hasMore, [action.groupId]: action.hasMore },
      };
    }

    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.serverTime };

    case 'MARK_READ':
      if (!state.unread[action.groupId]) return state;
      return { ...state, unread: { ...state.unread, [action.groupId]: 0 } };

    case 'START_LIVE':
      return { ...state, live: { ...state.live, [action.groupId]: { since: Date.now(), expiresLabel: action.expiresLabel } } };

    case 'STOP_LIVE':
      return { ...state, live: { ...state.live, [action.groupId]: undefined } };

    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, { ...action.expense, id: uid(), ts: Date.now() }] };

    case 'SETTLE': {
      const { people } = summarize(action.groupId, state.expenses, state.transfers);
      const p = people.find((x) => x.name === action.person);
      if (!p || p.net >= 0) return state; // only someone who owes can settle up
      // They pay what they owe to the current user, zeroing their balance.
      const transfer: Transfer = { id: uid(), groupId: action.groupId, from: action.person, to: CURRENT_USER, amount: -p.net, ts: Date.now() };
      return { ...state, transfers: [...state.transfers, transfer] };
    }

    case 'GROCERY_SET':
      return { ...state, grocery: action.grocery };

    case 'GROCERY_UPSERT': {
      const idx = state.grocery.findIndex((g) => g.id === action.item.id);
      const grocery = idx >= 0
        ? state.grocery.map((g, i) => (i === idx ? action.item : g))
        : [...state.grocery, action.item];
      return { ...state, grocery };
    }

    case 'GROCERY_REMOVE':
      return { ...state, grocery: state.grocery.filter((g) => g.id !== action.id) };

    case 'GROCERY_CLEAR_CHECKED':
      return { ...state, grocery: state.grocery.filter((g) => !g.checkedBy) };

    case 'TASK_SET':
      return { ...state, tasks: action.tasks };

    case 'TASK_UPSERT': {
      const idx = state.tasks.findIndex((t) => t.id === action.task.id);
      const tasks = idx >= 0
        ? state.tasks.map((t, i) => (i === idx ? action.task : t))
        : [...state.tasks, action.task];
      return { ...state, tasks };
    }

    case 'TASK_REMOVE':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };

    case 'EVENT_SET':
      return { ...state, events: action.events };

    case 'EVENT_UPSERT': {
      const idx = state.events.findIndex((e) => e.id === action.event.id);
      const events = idx >= 0
        ? state.events.map((e, i) => (i === idx ? action.event : e))
        : [...state.events, action.event];
      return { ...state, events };
    }

    case 'EVENT_REMOVE':
      return { ...state, events: state.events.filter((e) => e.id !== action.id) };

    case 'ALBUM_SET': {
      const albumIds = new Set(action.albums.map((a) => a.id));
      const photosByAlbum = Object.fromEntries(Object.entries(state.photosByAlbum).filter(([id]) => albumIds.has(id)));
      return { ...state, albums: action.albums, photosByAlbum };
    }

    case 'ALBUM_UPSERT': {
      const idx = state.albums.findIndex((a) => a.id === action.album.id);
      const albums = idx >= 0
        ? state.albums.map((a, i) => (i === idx ? action.album : a))
        : [...state.albums, action.album];
      return { ...state, albums };
    }

    case 'ALBUM_REMOVE': {
      const { [action.id]: _photos, ...photosByAlbum } = state.photosByAlbum;
      return { ...state, albums: state.albums.filter((a) => a.id !== action.id), photosByAlbum };
    }

    case 'PHOTOS_SET': {
      // A fresh full fetch is authoritative — also true up the album's
      // photoCount/coverPath in case WS events were missed while offline.
      const last = action.photos[action.photos.length - 1];
      const albums = state.albums.map((a) =>
        a.id === action.albumId ? { ...a, photoCount: action.photos.length, coverPath: last ? last.filePath : null } : a,
      );
      return { ...state, albums, photosByAlbum: { ...state.photosByAlbum, [action.albumId]: action.photos } };
    }

    case 'PHOTO_UPSERT': {
      const albumId = action.photo.albumId;
      const list = state.photosByAlbum[albumId];
      let photosByAlbum = state.photosByAlbum;
      let isNew = true;
      if (list) {
        const idx = list.findIndex((p) => p.id === action.photo.id);
        isNew = idx < 0;
        const merged = isNew
          ? [...list, action.photo].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))
          : list.map((p, i) => (i === idx ? action.photo : p));
        photosByAlbum = { ...photosByAlbum, [albumId]: merged };
      }
      // A fresh photo bumps the album's count and becomes its cover (it's the
      // latest in practice); an update (same id) leaves the aggregates alone.
      const albums = isNew
        ? state.albums.map((a) => (a.id === albumId ? { ...a, photoCount: a.photoCount + 1, coverPath: action.photo.filePath } : a))
        : state.albums;
      return { ...state, albums, photosByAlbum };
    }

    case 'PHOTO_REMOVE': {
      const list = state.photosByAlbum[action.albumId];
      let photosByAlbum = state.photosByAlbum;
      let nextList: ServerPhoto[] | undefined;
      let removed = true;
      if (list) {
        removed = list.some((p) => p.id === action.id);
        nextList = list.filter((p) => p.id !== action.id);
        photosByAlbum = { ...photosByAlbum, [action.albumId]: nextList };
      }
      const albums = state.albums.map((a) => {
        if (a.id !== action.albumId) return a;
        const photoCount = Math.max(0, a.photoCount - (removed ? 1 : 0));
        // With the list loaded we can recompute the cover exactly; otherwise
        // it may go stale until the next sync/loadPhotos trues it up.
        const coverPath = nextList ? nextList[nextList.length - 1]?.filePath ?? null : photoCount === 0 ? null : a.coverPath;
        return { ...a, photoCount, coverPath };
      });
      return { ...state, albums, photosByAlbum };
    }

    case 'SET_SESSION':
      return { ...state, session: action.session };

    case 'SET_FAMILY':
      return { ...state, family: action.family };

    case 'SESSION_READY':
      return state.sessionReady ? state : { ...state, sessionReady: true };

    case 'LOGOUT':
      // Clears session+family only — local/cached data stays put (the next
      // login's bootstrap replaces the chat slices wholesale).
      return { ...state, session: null, family: null };

    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, seedState);

  // Load persisted state once on mount.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        dispatch({ type: 'HYDRATE', payload: raw ? (JSON.parse(raw) as Persisted) : null });
      })
      .catch(() => dispatch({ type: 'HYDRATE', payload: null }));
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on every change once hydrated. Session/family are deliberately
  // excluded — they're re-derived from the secure-store token (below), never
  // cached in this AsyncStorage blob.
  useEffect(() => {
    if (!state.hydrated) return;
    const { hydrated: _hydrated, session: _session, family: _family, sessionReady: _sessionReady, ...persisted } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {});
  }, [state]);

  // Load the session token once on mount and, if present, hydrate session+family
  // from the server. A missing/expired/invalid token is a silent fail → logged out.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await tokenStorage.get();
        if (!token || cancelled) return;
        const { user, family } = await getMe(token);
        if (cancelled) return;
        dispatch({ type: 'SET_SESSION', session: { token, userId: user.id, username: user.username, name: user.name } });
        dispatch({ type: 'SET_FAMILY', family: family ? toFamilyState(family) : null });
      } catch {
        if (!cancelled) await tokenStorage.clear().catch(() => {});
      } finally {
        if (!cancelled) dispatch({ type: 'SESSION_READY' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Bootstrap chat state whenever a session becomes available (fresh login,
  // or the token-check effect above resolving one at launch).
  useEffect(() => {
    const token = state.session?.token;
    if (!token) return;
    let cancelled = false;
    getBootstrap(token)
      .then((payload) => {
        if (!cancelled) dispatch({ type: 'BOOTSTRAP', payload });
      })
      .catch((err) => console.warn('[store] bootstrap failed', err));
    return () => {
      cancelled = true;
    };
  }, [state.session?.token]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ── Hooks ────────────────────────────────────────────────────

function useCtx(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp* must be used within <AppStoreProvider>');
  return ctx;
}

/** Internal: raw dispatch access for the realtime bridge (useRealtime.ts).
 * Screens should use useActions() instead. */
export function useStoreDispatch(): React.Dispatch<Action> {
  return useCtx().dispatch;
}

/** Bound action creators — the write API for screens. */
export function useActions() {
  const { state, dispatch } = useCtx();
  const token = state.session?.token;

  return useMemo(
    () => ({
      sendMessage: (groupId: string, text: string) => {
        const authorId = state.session?.userId;
        if (!authorId) return;
        const id = uid();
        const msg: Message = { id, groupId, authorId, kind: 'text', text, ts: Date.now() };
        dispatch({ type: 'MERGE_MESSAGES', messages: [msg] });
        if (token) {
          postMessage(token, groupId, { id, kind: 'text', body: text }).catch((err) => console.warn('[store] sendMessage failed', err));
        }
      },

      sendLocation: (groupId: string, label: string, meta: string, live?: boolean) => {
        const authorId = state.session?.userId;
        if (!authorId) return;
        const id = uid();
        const loc = { label, meta };
        const msg: Message = { id, groupId, authorId, kind: 'loc', loc, live, ts: Date.now() };
        dispatch({ type: 'MERGE_MESSAGES', messages: [msg] });
        if (token) {
          postMessage(token, groupId, { id, kind: 'loc', loc, live }).catch((err) => console.warn('[store] sendLocation failed', err));
        }
      },

      /**
       * Optimistically posts a recorded clip as a voice message (local uri as
       * its mediaPath so the sender can play it back immediately), then
       * uploads it. On success, MERGE_MESSAGES upserts the same id with the
       * server row — its '/uploads/…' mediaPath wins. On failure, the
       * message simply stays local-only (playable by the sender, never seen
       * by anyone else) — mirrors every other action's fire-and-warn pattern.
       */
      sendVoice: (groupId: string, input: { uri: string; durationMs: number; mimeType: string; name: string }) => {
        const authorId = state.session?.userId;
        if (!authorId) return;
        const id = uid();
        const msg: Message = { id, groupId, authorId, kind: 'voice', mediaPath: input.uri, durationMs: input.durationMs, ts: Date.now() };
        dispatch({ type: 'MERGE_MESSAGES', messages: [msg] });
        if (!token) return;
        uploadVoice(token, groupId, { uri: input.uri, name: input.name, mimeType: input.mimeType, id, durationMs: input.durationMs })
          .then(({ message }) => dispatch({ type: 'MERGE_MESSAGES', messages: [fromServerMessage(message)] }))
          .catch((err) => console.warn('[store] sendVoice failed', err));
      },

      startLive: (groupId: string, expiresLabel: string) => dispatch({ type: 'START_LIVE', groupId, expiresLabel }),
      stopLive: (groupId: string) => dispatch({ type: 'STOP_LIVE', groupId }),

      markRead: (groupId: string) => {
        const userId = state.session?.userId;
        const now = Date.now();
        dispatch({ type: 'MARK_READ', groupId });
        if (userId) dispatch({ type: 'MERGE_READ', groupId, userId, ts: now });
        if (token) postRead(token, groupId, new Date(now).toISOString()).catch((err) => console.warn('[store] markRead failed', err));
      },

      loadEarlier: async (groupId: string) => {
        if (!token) return;
        const existing = state.messages[groupId] ?? [];
        const oldest = existing[0];
        const before = oldest ? new Date(oldest.ts).toISOString() : undefined;
        const { messages } = await getGroupMessages(token, groupId, { before, limit: 30 });
        dispatch({ type: 'PREPEND_HISTORY', groupId, messages: messages.map(fromServerMessage), hasMore: messages.length >= 30 });
      },

      createGroup: async (name: string, memberIds: string[]): Promise<string> => {
        if (!token) throw new Error('not signed in');
        const { group } = await apiCreateGroup(token, { name, memberIds });
        dispatch({ type: 'GROUP_UPSERT', group: toChatGroup(group) });
        return group.id;
      },

      renameGroup: async (groupId: string, name: string) => {
        if (!token) throw new Error('not signed in');
        const { group } = await apiRenameGroup(token, groupId, name);
        dispatch({ type: 'GROUP_UPSERT', group: toChatGroup(group) });
      },

      addMember: async (groupId: string, userId: string) => {
        if (!token) throw new Error('not signed in');
        const { group } = await addGroupMember(token, groupId, userId);
        dispatch({ type: 'GROUP_UPSERT', group: toChatGroup(group) });
      },

      leaveGroup: async (groupId: string) => {
        if (!token || !state.session) throw new Error('not signed in');
        await removeGroupMember(token, groupId, state.session.userId);
        dispatch({ type: 'GROUP_REMOVE', groupId });
      },

      addExpense: (expense: Omit<Expense, 'id' | 'ts'>) => dispatch({ type: 'ADD_EXPENSE', expense }),
      settle: (groupId: string, person: string) => dispatch({ type: 'SETTLE', groupId, person }),

      // ── Shared Grocery List ──────────────────────────────────

      addGrocery: (label: string, qty?: string) => {
        const userId = state.session?.userId;
        if (!userId) return;
        const id = uid();
        const item: ServerGroceryItem = {
          id,
          familyId: state.family?.id ?? '',
          label,
          qty: qty ?? null,
          checkedBy: null,
          checkedAt: null,
          createdBy: userId,
          ts: new Date().toISOString(),
        };
        dispatch({ type: 'GROCERY_UPSERT', item });
        if (token) addGroceryItem(token, { id, label, qty }).catch((err) => console.warn('[store] addGrocery failed', err));
      },

      toggleGrocery: (id: string) => {
        const userId = state.session?.userId;
        const current = state.grocery.find((g) => g.id === id);
        if (current) {
          const optimistic: ServerGroceryItem = current.checkedBy
            ? { ...current, checkedBy: null, checkedAt: null }
            : { ...current, checkedBy: userId ?? current.checkedBy, checkedAt: new Date().toISOString() };
          dispatch({ type: 'GROCERY_UPSERT', item: optimistic });
        }
        if (token) toggleGroceryItem(token, id).catch((err) => console.warn('[store] toggleGrocery failed', err));
      },

      removeGrocery: (id: string) => {
        dispatch({ type: 'GROCERY_REMOVE', id });
        if (token) removeGroceryItem(token, id).catch((err) => console.warn('[store] removeGrocery failed', err));
      },

      clearCheckedGrocery: () => {
        dispatch({ type: 'GROCERY_CLEAR_CHECKED' });
        if (token) apiClearCheckedGrocery(token).catch((err) => console.warn('[store] clearCheckedGrocery failed', err));
      },

      // ── Shared Tasks ─────────────────────────────────────────

      addTask: (input: { title: string; notes?: string; assigneeId?: string; dueDate?: string }) => {
        const userId = state.session?.userId;
        if (!userId) return;
        const id = uid();
        const task: ServerTask = {
          id,
          familyId: state.family?.id ?? '',
          title: input.title,
          notes: input.notes ?? null,
          assigneeId: input.assigneeId ?? null,
          dueDate: input.dueDate ?? null,
          done: false,
          doneBy: null,
          doneAt: null,
          createdBy: userId,
          ts: new Date().toISOString(),
        };
        dispatch({ type: 'TASK_UPSERT', task });
        if (token) {
          addTaskItem(token, { id, title: input.title, notes: input.notes, assigneeId: input.assigneeId, dueDate: input.dueDate }).catch((err) =>
            console.warn('[store] addTask failed', err),
          );
        }
      },

      toggleTask: (id: string) => {
        const userId = state.session?.userId;
        const current = state.tasks.find((t) => t.id === id);
        if (current) {
          const optimistic: ServerTask = current.done
            ? { ...current, done: false, doneBy: null, doneAt: null }
            : { ...current, done: true, doneBy: userId ?? current.doneBy, doneAt: new Date().toISOString() };
          dispatch({ type: 'TASK_UPSERT', task: optimistic });
        }
        if (token) toggleTaskItem(token, id).catch((err) => console.warn('[store] toggleTask failed', err));
      },

      updateTask: (id: string, patch: TaskPatch) => {
        const current = state.tasks.find((t) => t.id === id);
        if (current) {
          dispatch({
            type: 'TASK_UPSERT',
            task: {
              ...current,
              ...(patch.title !== undefined ? { title: patch.title } : {}),
              ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
              ...(patch.assigneeId !== undefined ? { assigneeId: patch.assigneeId } : {}),
              ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
            },
          });
        }
        if (token) updateTaskItem(token, id, patch).catch((err) => console.warn('[store] updateTask failed', err));
      },

      removeTask: (id: string) => {
        dispatch({ type: 'TASK_REMOVE', id });
        if (token) removeTaskItem(token, id).catch((err) => console.warn('[store] removeTask failed', err));
      },

      // ── Shared Calendar ──────────────────────────────────────

      addEvent: (input: { title: string; notes?: string; startTs: string; endTs?: string; allDay?: boolean }) => {
        const userId = state.session?.userId;
        if (!userId) return;
        const id = uid();
        const event: ServerEvent = {
          id,
          familyId: state.family?.id ?? '',
          title: input.title,
          notes: input.notes ?? null,
          startTs: input.startTs,
          endTs: input.endTs ?? null,
          allDay: !!input.allDay,
          createdBy: userId,
          ts: new Date().toISOString(),
        };
        dispatch({ type: 'EVENT_UPSERT', event });
        if (token) {
          addEventItem(token, { id, title: input.title, notes: input.notes, startTs: input.startTs, endTs: input.endTs, allDay: input.allDay }).catch(
            (err) => console.warn('[store] addEvent failed', err),
          );
        }
      },

      updateEvent: (id: string, patch: EventPatch) => {
        const current = state.events.find((e) => e.id === id);
        if (current) {
          dispatch({
            type: 'EVENT_UPSERT',
            event: {
              ...current,
              ...(patch.title !== undefined ? { title: patch.title } : {}),
              ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
              ...(patch.startTs !== undefined ? { startTs: patch.startTs } : {}),
              ...(patch.endTs !== undefined ? { endTs: patch.endTs } : {}),
              ...(patch.allDay !== undefined ? { allDay: patch.allDay } : {}),
            },
          });
        }
        if (token) updateEventItem(token, id, patch).catch((err) => console.warn('[store] updateEvent failed', err));
      },

      removeEvent: (id: string) => {
        dispatch({ type: 'EVENT_REMOVE', id });
        if (token) removeEventItem(token, id).catch((err) => console.warn('[store] removeEvent failed', err));
      },

      // ── Shared Photo Albums ──────────────────────────────────

      /** Optimistically creates an album and returns its (client-generated) id. */
      createAlbum: async (name: string): Promise<string> => {
        const userId = state.session?.userId;
        if (!userId) throw new Error('not signed in');
        const id = uid();
        const album: ServerAlbum = {
          id,
          familyId: state.family?.id ?? '',
          name,
          createdBy: userId,
          ts: new Date().toISOString(),
          photoCount: 0,
          coverPath: null,
        };
        dispatch({ type: 'ALBUM_UPSERT', album });
        if (token) createAlbumItem(token, { id, name }).catch((err) => console.warn('[store] createAlbum failed', err));
        return id;
      },

      renameAlbum: (id: string, name: string) => {
        const current = state.albums.find((a) => a.id === id);
        if (current) dispatch({ type: 'ALBUM_UPSERT', album: { ...current, name } });
        if (token) renameAlbumItem(token, id, name).catch((err) => console.warn('[store] renameAlbum failed', err));
      },

      removeAlbum: (id: string) => {
        dispatch({ type: 'ALBUM_REMOVE', id });
        if (token) removeAlbumItem(token, id).catch((err) => console.warn('[store] removeAlbum failed', err));
      },

      /** Fetch an album's photos (lazy — photos never ride along in bootstrap/sync). */
      loadPhotos: async (albumId: string) => {
        if (!token) return;
        const { photos } = await getAlbumPhotos(token, albumId);
        dispatch({ type: 'PHOTOS_SET', albumId, photos });
      },

      /**
       * Open the system image picker and upload the chosen photo. NOT
       * optimistic — the row is only added once the server responds, so
       * callers should show a pending state while the promise is in flight.
       * Resolves true if a photo was uploaded, false if the user cancelled.
       */
      addPhotoFromPicker: async (albumId: string): Promise<boolean> => {
        if (!token) throw new Error('not signed in');
        if (Platform.OS !== 'web') {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) throw new Error('Photo library access was denied');
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsMultipleSelection: false,
        });
        if (result.canceled || !result.assets.length) return false;
        const asset = result.assets[0];
        const mimeType = asset.mimeType ?? 'image/jpeg';
        const name = asset.fileName ?? `photo-${Date.now()}.${mimeType.split('/')[1] ?? 'jpg'}`;
        const { photo } = await uploadPhoto(token, albumId, {
          uri: asset.uri,
          name,
          mimeType,
          w: asset.width,
          h: asset.height,
        });
        dispatch({ type: 'PHOTO_UPSERT', photo });
        return true;
      },

      removePhoto: (photoId: string, albumId: string) => {
        dispatch({ type: 'PHOTO_REMOVE', id: photoId, albumId });
        if (token) removePhotoItem(token, photoId).catch((err) => console.warn('[store] removePhoto failed', err));
      },

      /** Log in an existing user, persist the token, and hydrate family state. */
      login: async (username: string, password: string) => {
        const { token: newToken, user } = await authLogin({ username, password });
        await tokenStorage.set(newToken);
        dispatch({ type: 'SET_SESSION', session: { token: newToken, userId: user.id, username: user.username, name: user.name } });
        try {
          const me = await getMe(newToken);
          dispatch({ type: 'SET_FAMILY', family: me.family ? toFamilyState(me.family) : null });
        } catch {
          dispatch({ type: 'SET_FAMILY', family: null });
        }
      },

      /** Register a new user, then log them in immediately (register has no session of its own). */
      register: async (username: string, password: string, name: string) => {
        await authRegister({ username, password, name });
        const { token: newToken, user } = await authLogin({ username, password });
        await tokenStorage.set(newToken);
        dispatch({ type: 'SET_SESSION', session: { token: newToken, userId: user.id, username: user.username, name: user.name } });
        dispatch({ type: 'SET_FAMILY', family: null }); // brand-new account: never in a family yet
      },

      /** Log out: best-effort server-side session revoke, then always clear local state. */
      logout: async () => {
        try {
          if (token) await authLogout(token);
        } catch {
          // Non-fatal — the token may already be expired/gone server-side.
        }
        await tokenStorage.clear().catch(() => {});
        dispatch({ type: 'LOGOUT' });
      },

      createFamily: async (name: string) => {
        if (!token) throw new Error('not signed in');
        const info = await apiCreateFamily(token, name);
        dispatch({ type: 'SET_FAMILY', family: toFamilyState(info) });
      },

      joinFamily: async (code: string) => {
        if (!token) throw new Error('not signed in');
        const info = await apiJoinFamily(token, code);
        dispatch({ type: 'SET_FAMILY', family: toFamilyState(info) });
      },
    }),
    [dispatch, token, state.session, state.family, state.messages, state.grocery, state.tasks, state.events, state.albums],
  );
}

/** A chat-list row: dynamic group meta + derived preview/time/unread/live. */
export interface ChatRow {
  id: string;
  name: string;
  /** Group size for the row badge; null for a 1:1 DM. */
  members: number | null;
  preview: string;
  time: string;
  unread: number;
  live: boolean;
}

function messagePreview(m: Message | undefined, myId: string | undefined, nameOf: (id: string) => string): string {
  if (!m) return 'No messages yet';
  const who = m.authorId === myId ? 'You: ' : `${nameOf(m.authorId)}: `;
  if (m.kind === 'loc') return `${who}📍 ${m.loc?.label ?? 'shared a location'}`;
  if (m.kind === 'voice') return `${who}🎤 Voice message`;
  return `${who}${m.text ?? ''}`.trim();
}

export function useChatRows(): ChatRow[] {
  const { state } = useCtx();
  return useMemo(() => {
    const myId = state.session?.userId;
    const nameOf = (id: string) => state.family?.members.find((m) => m.id === id)?.name ?? id;
    const rows = Object.values(state.groups).map((g): ChatRow & { _lastTs: number } => {
      const msgs = state.messages[g.id];
      const last = msgs && msgs.length ? msgs[msgs.length - 1] : undefined;
      return {
        id: g.id,
        name: g.name,
        members: g.members.length > 2 ? g.members.length : null,
        preview: messagePreview(last, myId, nameOf),
        time: last ? timeLabel(last.ts) : '',
        unread: state.unread[g.id] ?? 0,
        live: !!state.live[g.id],
        _lastTs: last?.ts ?? 0,
      };
    });
    rows.sort((a, b) => b._lastTs - a._lastTs || a.name.localeCompare(b.name));
    return rows.map(({ _lastTs, ...row }) => row);
  }, [state.groups, state.messages, state.unread, state.live, state.session, state.family]);
}

export function useMessages(groupId: string): Message[] {
  const { state } = useCtx();
  return state.messages[groupId] ?? [];
}

export function useUnread(groupId: string): number {
  return useCtx().state.unread[groupId] ?? 0;
}

export function useLive(groupId: string): LiveShare | undefined {
  return useCtx().state.live[groupId];
}

/** All group ids currently sharing live location. */
export function useLiveGroups(): string[] {
  const { state } = useCtx();
  return useMemo(() => Object.keys(state.live).filter((id) => state.live[id]), [state.live]);
}

export function useGroups(): Record<string, ChatGroup> {
  return useCtx().state.groups;
}

export function useGroup(groupId: string): ChatGroup | undefined {
  return useCtx().state.groups[groupId];
}

/** groupId -> userId -> last-read ts (ms), for computing read receipts. */
export function useReadCursors(groupId: string): Record<string, number> {
  return useCtx().state.readCursors[groupId] ?? {};
}

export function useHasMore(groupId: string): boolean {
  return !!useCtx().state.hasMore[groupId];
}

export function useLastSync(): string | null {
  return useCtx().state.lastSync;
}

export function useLedger(groupId: string): LedgerSummary {
  const { state } = useCtx();
  return useMemo(() => summarize(groupId, state.expenses, state.transfers), [state.expenses, state.transfers, groupId]);
}

export function useHydrated(): boolean {
  return useCtx().state.hydrated;
}

/** The signed-in user, or null when logged out. */
export function useSession(): Session | null {
  return useCtx().state.session;
}

/** The session user's Family Space, or null until they create/join one. */
export function useFamily(): FamilyState | null {
  return useCtx().state.family;
}

/** True once the initial secure-store token check (and /me call) has settled —
 * use this to avoid flashing the login screen while that check is in flight. */
export function useSessionReady(): boolean {
  return useCtx().state.sessionReady;
}

/** The shared grocery list, sorted unchecked-first then by creation order. */
export function useGrocery(): ServerGroceryItem[] {
  const { state } = useCtx();
  return useMemo(
    () =>
      [...state.grocery].sort((a, b) => {
        const aChecked = a.checkedBy ? 1 : 0;
        const bChecked = b.checkedBy ? 1 : 0;
        if (aChecked !== bChecked) return aChecked - bChecked; // unchecked first
        return Date.parse(a.ts) - Date.parse(b.ts);
      }),
    [state.grocery],
  );
}

/** The shared task list, sorted open-first then by due date (nulls last) then creation order. */
export function useTasks(): ServerTask[] {
  const { state } = useCtx();
  return useMemo(
    () =>
      [...state.tasks].sort((a, b) => {
        const aDone = a.done ? 1 : 0;
        const bDone = b.done ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone; // open first
        const aDue = a.dueDate ? Date.parse(a.dueDate) : Infinity;
        const bDue = b.dueDate ? Date.parse(b.dueDate) : Infinity;
        if (aDue !== bDue) return aDue - bDue; // due date asc, nulls last
        return Date.parse(a.ts) - Date.parse(b.ts);
      }),
    [state.tasks],
  );
}

/** The shared calendar events, sorted by start time ascending. */
export function useEvents(): ServerEvent[] {
  const { state } = useCtx();
  return useMemo(() => [...state.events].sort((a, b) => Date.parse(a.startTs) - Date.parse(b.startTs)), [state.events]);
}

/** The family's photo albums (with photoCount/coverPath), sorted by creation time ascending. */
export function useAlbums(): ServerAlbum[] {
  const { state } = useCtx();
  return useMemo(() => [...state.albums].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts)), [state.albums]);
}

/** An album's photos, ascending by ts — or undefined until loadPhotos(albumId) has run. */
export function useAlbumPhotos(albumId: string): ServerPhoto[] | undefined {
  return useCtx().state.photosByAlbum[albumId];
}
