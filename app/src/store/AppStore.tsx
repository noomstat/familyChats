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

const STORAGE_KEY = 'familychats:store:v1';

// ── State ────────────────────────────────────────────────────

export interface AppState {
  messages: Record<string, Message[]>;
  unread: Record<string, number>;
  live: Record<string, LiveShare | undefined>;
  expenses: Expense[];
  transfers: Transfer[];
  /** True once we've attempted to load persisted state. */
  hydrated: boolean;
}

/** The persisted slice — everything except the transient `hydrated` flag. */
type Persisted = Omit<AppState, 'hydrated'>;

const seedState: AppState = {
  messages: SEED_MESSAGES,
  unread: SEED_UNREAD,
  live: SEED_LIVE,
  expenses: SEED_EXPENSES,
  transfers: SEED_TRANSFERS,
  hydrated: false,
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
  | { type: 'SETTLE'; groupId: string; person: string };

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function push(map: Record<string, Message[]>, groupId: string, msg: Message): Record<string, Message[]> {
  return { ...map, [groupId]: [...(map[groupId] ?? []), msg] };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...(action.payload ? { ...seedState, ...action.payload } : state), hydrated: true };

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

  // Persist on every change once hydrated.
  useEffect(() => {
    if (!state.hydrated) return;
    const { hydrated: _omit, ...persisted } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {});
  }, [state]);

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
  const { dispatch } = useCtx();
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
    }),
    [dispatch],
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
