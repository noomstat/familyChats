import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CURRENT_USER,
  Expense,
  Group,
  GROUPS,
  LedgerSummary,
  LiveShare,
  Message,
  previewOf,
  SEED_EXPENSES,
  SEED_LIVE,
  SEED_MESSAGES,
  SEED_TRANSFERS,
  SEED_UNREAD,
  timeLabel,
  Transfer,
  summarize,
} from './model';
import { tokenStorage } from './tokenStorage';
import {
  FamilyInfo,
  FamilyMember,
  authLogin,
  authLogout,
  authRegister,
  createFamily as apiCreateFamily,
  getMe,
  joinFamily as apiJoinFamily,
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

export interface AppState {
  messages: Record<string, Message[]>;
  unread: Record<string, number>;
  live: Record<string, LiveShare | undefined>;
  expenses: Expense[];
  transfers: Transfer[];
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

/** The persisted slice — local demo data only. Session/family are re-fetched
 * from the server each launch (via the secure-store token), never cached here. */
type Persisted = Omit<AppState, 'hydrated' | 'session' | 'family' | 'sessionReady'>;

const seedState: AppState = {
  messages: SEED_MESSAGES,
  unread: SEED_UNREAD,
  live: SEED_LIVE,
  expenses: SEED_EXPENSES,
  transfers: SEED_TRANSFERS,
  hydrated: false,
  session: null,
  family: null,
  sessionReady: false,
};

// ── Actions ──────────────────────────────────────────────────

type Action =
  | { type: 'HYDRATE'; payload: Persisted | null }
  | { type: 'SEND_MESSAGE'; groupId: string; text: string }
  | { type: 'SEND_LOCATION'; groupId: string; label: string; meta: string; live?: boolean }
  | { type: 'START_LIVE'; groupId: string; expiresLabel: string }
  | { type: 'STOP_LIVE'; groupId: string }
  | { type: 'MARK_READ'; groupId: string }
  | { type: 'ADD_EXPENSE'; expense: Omit<Expense, 'id' | 'ts'> }
  | { type: 'SETTLE'; groupId: string; person: string }
  | { type: 'SET_SESSION'; session: Session | null }
  | { type: 'SET_FAMILY'; family: FamilyState | null }
  | { type: 'SESSION_READY' }
  | { type: 'LOGOUT' };

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function push(map: Record<string, Message[]>, groupId: string, msg: Message): Record<string, Message[]> {
  return { ...map, [groupId]: [...(map[groupId] ?? []), msg] };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      // Merge the persisted demo-data slice only — session/family are never
      // part of this blob (see Persisted), so this can't clobber a session
      // already established by the token-check effect, whichever runs first.
      return action.payload
        ? { ...seedState, ...action.payload, session: state.session, family: state.family, sessionReady: state.sessionReady, hydrated: true }
        : { ...state, hydrated: true };

    case 'SEND_MESSAGE': {
      const msg: Message = { id: uid(), mine: true, text: action.text, ts: Date.now() };
      return { ...state, messages: push(state.messages, action.groupId, msg) };
    }

    case 'SEND_LOCATION': {
      const msg: Message = {
        id: uid(),
        mine: true,
        live: action.live,
        loc: { label: action.label, meta: action.meta },
        ts: Date.now(),
      };
      return { ...state, messages: push(state.messages, action.groupId, msg) };
    }

    case 'START_LIVE':
      return { ...state, live: { ...state.live, [action.groupId]: { since: Date.now(), expiresLabel: action.expiresLabel } } };

    case 'STOP_LIVE':
      return { ...state, live: { ...state.live, [action.groupId]: undefined } };

    case 'MARK_READ':
      if (!state.unread[action.groupId]) return state;
      return { ...state, unread: { ...state.unread, [action.groupId]: 0 } };

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

    case 'SET_SESSION':
      return { ...state, session: action.session };

    case 'SET_FAMILY':
      return { ...state, family: action.family };

    case 'SESSION_READY':
      return state.sessionReady ? state : { ...state, sessionReady: true };

    case 'LOGOUT':
      // Clears session+family only — local demo data (messages, expenses, …) stays put.
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

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ── Hooks ────────────────────────────────────────────────────

function useCtx(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp* must be used within <AppStoreProvider>');
  return ctx;
}

/** Bound action creators — the write API for screens. */
export function useActions() {
  const { state, dispatch } = useCtx();
  const token = state.session?.token;

  return useMemo(
    () => ({
      sendMessage: (groupId: string, text: string) => dispatch({ type: 'SEND_MESSAGE', groupId, text }),
      sendLocation: (groupId: string, label: string, meta: string, live?: boolean) =>
        dispatch({ type: 'SEND_LOCATION', groupId, label, meta, live }),
      startLive: (groupId: string, expiresLabel: string) => dispatch({ type: 'START_LIVE', groupId, expiresLabel }),
      stopLive: (groupId: string) => dispatch({ type: 'STOP_LIVE', groupId }),
      markRead: (groupId: string) => dispatch({ type: 'MARK_READ', groupId }),
      addExpense: (expense: Omit<Expense, 'id' | 'ts'>) => dispatch({ type: 'ADD_EXPENSE', expense }),
      settle: (groupId: string, person: string) => dispatch({ type: 'SETTLE', groupId, person }),

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
    [dispatch, token],
  );
}

/** A chat-list row: static group meta + live-derived preview/time/unread/live. */
export interface ChatRow extends Group {
  preview: string;
  time: string;
  unread: number;
  live: boolean;
}

export function useChatRows(): ChatRow[] {
  const { state } = useCtx();
  return useMemo(
    () =>
      GROUPS.map((g) => {
        const msgs = state.messages[g.id];
        const last = msgs && msgs.length ? msgs[msgs.length - 1] : undefined;
        return {
          ...g,
          preview: previewOf(msgs),
          time: last ? timeLabel(last.ts) : '',
          unread: state.unread[g.id] ?? 0,
          live: !!state.live[g.id],
        };
      }),
    [state.messages, state.unread, state.live],
  );
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
