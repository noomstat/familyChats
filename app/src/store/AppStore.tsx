import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {
  CATEGORIES,
  CategoryMeta,
  FinanceSummary,
  LiveShare,
  Message,
  Note,
  monthKey,
  resolveCategory,
  summarizeFinance,
  timeLabel,
} from './model';
import { tokenStorage } from './tokenStorage';
import { keyStorage } from './keyStorage';
import { identityKeyStorage } from './identityKeyStorage';
import { decryptPayload, decryptPayloadWithKeys, encryptPayload, generateFamilyKey, isEnvelope, parseKeyInput, unwrapKey, wrapKey } from '../crypto/e2ee';
import { buildFriendCode, deriveSharedKey, generateIdentityKeypair, parseFriendCode } from '../crypto/friends';
import {
  BootstrapResponse,
  EventPatch,
  FamilyInfo,
  FamilyMember,
  Friend,
  FriendGroupKey,
  KeyRoll,
  ServerAlbum,
  ServerBudget,
  ServerCategory,
  ServerEvent,
  ServerExpense,
  ServerGroup,
  ServerGroceryItem,
  ServerMessage,
  ServerNote,
  ServerPhoto,
  ServerTask,
  ServerTransfer,
  TaskPatch,
  TaskRecurrence,
  UploadFile,
  authLogin,
  authLogout,
  authRegister,
  addCategory as apiAddCategory,
  addEventItem,
  addExpense as apiAddExpense,
  addFriendGroupMember as apiAddFriendGroupMember,
  addGroupMember,
  addGroceryItem,
  addNote as apiAddNote,
  addTaskItem,
  addTransfer as apiAddTransfer,
  clearCheckedGrocery as apiClearCheckedGrocery,
  connectByQr as apiConnectByQr,
  createAlbumItem,
  createFamily as apiCreateFamily,
  createFriendGroup as apiCreateFriendGroup,
  createGroup as apiCreateGroup,
  getAlbumPhotos,
  getBootstrap,
  getFriendCode,
  getGroupMessages,
  getMe,
  joinFamily as apiJoinFamily,
  leaveFriendGroup as apiLeaveFriendGroup,
  openDm as apiOpenDm,
  postKeyRoll,
  postMessage,
  postRead,
  publishKey as apiPublishKey,
  putBudget as apiPutBudget,
  remindPayment as apiRemindPayment,
  removeAlbumItem,
  removeCategory as apiRemoveCategory,
  removeEventItem,
  removeExpense as apiRemoveExpense,
  removeGroupMember,
  removeGroceryItem,
  removeNote as apiRemoveNote,
  removePhotoItem,
  removeTaskItem,
  renameAlbumItem,
  renameFriendGroup as apiRenameFriendGroup,
  renameGroup as apiRenameGroup,
  setActiveFamilyId as apiSetActiveFamilyId,
  toggleGroceryItem,
  toggleTaskItem,
  updateEventItem,
  updateNote as apiUpdateNote,
  updateTaskItem,
  uploadPhoto,
  uploadReceipt as apiUploadReceipt,
  uploadVoice,
} from '../api/client';

// Phase S — persists only the *chosen* active family id (a plain string), not
// the families/family slices themselves (those stay session-derived, same as
// session/family always have been — see Persisted below). Read explicitly in
// the token-check effect, sequenced BEFORE the first getMe() call, so a cold
// relaunch's X-Family-Id header carries the user's last choice instead of
// racing the generic AsyncStorage HYDRATE effect (which resolves independently
// and would otherwise clobber whichever value "won" the race).
const ACTIVE_FAMILY_KEY = 'familychats:active-family-id';

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
  /** Phase K — true once the owner has turned on end-to-end encryption. One-way (no disable). */
  e2ee: boolean;
}

function toFamilyState(info: FamilyInfo): FamilyState {
  return {
    id: info.family.id,
    name: info.family.name,
    inviteCode: info.family.inviteCode,
    role: info.family.role,
    members: info.members,
    e2ee: info.family.e2ee,
  };
}

/** A server-backed chat group (dynamic — created/renamed/joined at runtime). */
export interface ChatGroup {
  id: string;
  /** null for a friends-kind group (Phase V) — friend conversations have no family. */
  familyId: string | null;
  /** Phase V — 'family' (every group before this phase) or 'friends' (a 1:1 DM or friend group). */
  kind: 'family' | 'friends';
  name: string;
  /** User ids. */
  members: string[];
  /** Phase V — friends-kind groups only: every member's display name (family groups instead resolve names via `family.members`). */
  memberNames?: Record<string, string>;
  /** Phase V — friends-kind groups only: every member's current published public key (null if never published) — what conversationKeyFor() uses to derive/unwrap the conversation key. */
  memberPublicKeys?: Record<string, string | null>;
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
  /** Family Finance: server-backed shared expenses/settlements/budget — see useFinance(). */
  finExpenses: ServerExpense[];
  finTransfers: ServerTransfer[];
  budget: ServerBudget | null;
  /** Phase R — family's custom expense categories, unsorted — see useCategories() for the built-ins-merged, display-ready list. */
  categories: ServerCategory[];
  /** Server-backed shared grocery list, unsorted — see useGrocery() for display order. */
  grocery: ServerGroceryItem[];
  /** Server-backed shared tasks, unsorted — see useTasks() for display order. */
  tasks: ServerTask[];
  /** Server-backed shared calendar events, unsorted — see useEvents() for display order. */
  events: ServerEvent[];
  /** Phase P — E2EE shared family notes, unsorted — see useNotes() for display order. */
  notes: Note[];
  /** Server-backed shared photo albums (metadata + photoCount/coverPath), unsorted — see useAlbums(). */
  albums: ServerAlbum[];
  /** Photos per album, ascending by ts — loaded lazily via loadPhotos(); an
   * absent key means "not loaded yet" (vs. an empty array = loaded, empty). */
  photosByAlbum: Record<string, ServerPhoto[]>;
  /** Phase U — user-level and family-independent (present even for a family-less user), unsorted — see useFriends(). */
  friends: Friend[];
  /** Phase U — true once this device's identity keypair exists AND its public key has been published to the server at least once this session. Not persisted — re-derived each launch (see the identity-ready effect below). */
  identityReady: boolean;
  /** True once we've attempted to load persisted state. */
  hydrated: boolean;
  /** The signed-in user, or null when logged out. Not persisted to AsyncStorage —
   * rehydrated each launch from the secure-store token via GET /me. */
  session: Session | null;
  /** Phase S — every family the session user belongs to. Not persisted (like
   * session/family) — re-fetched from /me each launch and kept live via
   * createFamily/joinFamily/switchFamily and the `family` WS members/upsert
   * events (see FAMILY_PATCH). */
  families: FamilyState[];
  /** Phase S — the active family's id (drives the `X-Family-Id` header via
   * api/client.ts's setActiveFamilyId — see the token-check effect and
   * switchFamily). Persisted separately (ACTIVE_FAMILY_KEY), not via the
   * generic AsyncStorage blob — see that constant's comment. */
  activeFamilyId: string | null;
  /** The active family (families.find(activeFamilyId)), or null until the
   * session user has created/joined at least one. Every pre-Phase-S call site
   * that reads `family` keeps working unchanged — it always means "the
   * currently active family". */
  family: FamilyState | null;
  /** True once the initial secure-store token check (and /me call) has settled. */
  sessionReady: boolean;
  /** Phase K/N — true once the current family's E2EE keyring is loaded into
   * the module-level familyKeyRing (see below). Not persisted — re-derived
   * from keyStorage each launch, same as session/family. Drives useE2EE()'s
   * `hasKey` so locked-message UI can react without reading the cache directly. */
  hasFamilyKey: boolean;
}

/** The persisted slice — local/offline-read demo + chat cache. Session/family(s)/
 * activeFamilyId are re-fetched/re-read from the server/dedicated storage each
 * launch, never cached in this generic blob. */
type Persisted = Omit<AppState, 'hydrated' | 'session' | 'family' | 'families' | 'activeFamilyId' | 'sessionReady' | 'hasFamilyKey' | 'identityReady'>;

const seedState: AppState = {
  groups: {},
  messages: {},
  readCursors: {},
  unread: {},
  hasMore: {},
  lastSync: null,
  live: {},
  finExpenses: [],
  finTransfers: [],
  budget: null,
  categories: [],
  grocery: [],
  tasks: [],
  events: [],
  notes: [],
  albums: [],
  photosByAlbum: {},
  friends: [],
  identityReady: false,
  hydrated: false,
  session: null,
  families: [],
  activeFamilyId: null,
  family: null,
  sessionReady: false,
  hasFamilyKey: false,
};

// ── E2EE family keyring cache ────────────────────────────────
//
// Module-level (not component state) so fromServerMessage — a plain exported
// function with no hook access — can decrypt synchronously. v1 is one family
// per user, so a single slot (not keyed per-family-id beyond the guard below)
// is sufficient; the familyId is kept alongside the keys purely as a
// staleness guard against a leftover cache entry from a previously-loaded
// family. Populated: on family load, after createFamily(), after
// importFamilyKey(), after joinFamily() when the invite carried a key, after
// rotateKey(), and after an incoming WS `keyroll` (see applyIncomingKeyRoll).
// Cleared on logout. AppState.hasFamilyKey mirrors this for reactive UI
// (useE2EE()).
//
// Phase N — `keys` is the full ring, oldest-first (index 0 = the anchor key
// from the invite, last = active/used to encrypt new messages). Rotation
// never removes a key, so every current member keeps reading all history —
// see e2ee.ts's header comment for the full trade-off writeup.
let familyKeyRing: { familyId: string; keys: string[] } | null = null;

/** The key currently used to encrypt outgoing messages, or null if we hold no ring for this family (or it's a different/stale one). */
function activeKeyFor(familyId: string | undefined): string | null {
  if (!familyId || !familyKeyRing || familyKeyRing.familyId !== familyId) return null;
  return familyKeyRing.keys[familyKeyRing.keys.length - 1] ?? null;
}

/**
 * Fixpoint replay: repeatedly try `unwrapKey(k, roll.wrapped)` for every key
 * currently in `ring` against every roll, appending any newly-recovered key,
 * until a full pass adds nothing. Order-independent (rolls can arrive/replay
 * in any order) and gap-tolerant (a roll wrapped under a key this ring
 * doesn't have yet just waits for a later pass once that key shows up).
 * Never mutates `ring` — returns the SAME reference when nothing new was
 * recovered, so callers can cheaply check `next !== ring` to decide whether
 * to persist + REDECRYPT.
 */
function applyKeyRolls(ring: string[], rolls: { wrapped: string }[]): string[] {
  let keys = ring;
  const known = new Set(keys);
  let grew = true;
  while (grew) {
    grew = false;
    for (const roll of rolls) {
      for (const k of keys) {
        const recovered = unwrapKey(k, roll.wrapped);
        if (recovered && !known.has(recovered)) {
          keys = [...keys, recovered];
          known.add(recovered);
          grew = true;
          break; // this roll is resolved for now — move on to the next one
        }
      }
    }
  }
  return keys;
}

// ── Phase V — friend conversation keying cache ─────────────────
//
// Module-level for the same reason as familyKeyRing above: fromServerMessage
// is a plain exported function with no hook access, so it needs a
// synchronous, non-React place to read from. Unlike family chat (one key per
// family, all messages try the same ring), each friend conversation has its
// OWN key — a DM's is pure X25519 Diffie-Hellman between the two members
// (nothing stored server-side), a friend GROUP's is a random key wrapped
// per-member (friend_group_keys) that this device unwraps with its own
// pairwise DH secret. `groupsCache` mirrors state.groups (kept in sync by
// upsertConversation/BOOTSTRAP) so fromServerMessage can look up a message's
// conversation kind/members/public keys without threading `state` through
// it. `resolvedConvoKeys` is a derived, fully-recomputable cache (never the
// source of truth) — recomputing it for every friends-kind group is cheap at
// friend-scale (a handful to dozens of conversations), so there's no
// incremental-invalidation logic to get wrong.
let myIdentity: { privB64: string; pubB64: string } | null = null;
let myUserId: string | null = null;
let groupsCache: Record<string, ChatGroup> = {};
/** groupId -> my own wrapped copy of that friend GROUP's key (+ the wrapper's public key, so unwrapping never depends on the wrapper already being in this device's own friends list). Empty for a DM (no row is ever stored for one — see server/db/014_friend_convos.sql). */
let friendGroupKeyWraps: Record<string, { wrapped: string; wrappedByPublicKey: string | null }> = {};
/** groupId -> resolved symmetric key, for every friends-kind conversation this device can currently derive/unwrap. */
let resolvedConvoKeys: Record<string, string> = {};

/**
 * The symmetric key for one friend conversation, or null if it can't be
 * resolved yet (identity not loaded, or a group/DM-partner's public key
 * hasn't been published/seen yet). Client rule (Phase V plan): a
 * friend_group_keys entry for this group means "unwrap it"; otherwise it's a
 * DM — derive directly with the other member. No-op (returns null
 * immediately) for a family-kind group — those use activeKeyFor() instead.
 */
function conversationKeyFor(group: ChatGroup): string | null {
  if (group.kind !== 'friends' || !myIdentity) return null;
  const wrap = friendGroupKeyWraps[group.id];
  if (wrap) {
    if (!wrap.wrappedByPublicKey) return null;
    const pairwise = deriveSharedKey(myIdentity.privB64, wrap.wrappedByPublicKey);
    return unwrapKey(pairwise, wrap.wrapped);
  }
  if (!myUserId) return null;
  const otherId = group.members.find((id) => id !== myUserId);
  const otherPub = otherId ? group.memberPublicKeys?.[otherId] : undefined;
  if (!otherId || !otherPub) return null;
  return deriveSharedKey(myIdentity.privB64, otherPub);
}

/**
 * The key to encrypt an OUTGOING message with for a given conversation — the
 * resolved friend-conversation key for a friends-kind group (falling back to
 * a fresh conversationKeyFor() attempt if the cache hasn't caught up yet),
 * or the active family key for an e2ee family group. Null means either "send
 * unencrypted" (a non-e2ee family — still allowed) or "can't send yet" (a
 * friends-kind group whose key isn't resolvable on this device) — every
 * friends-kind group is unconditionally encrypted server-side (Phase V), so
 * screens should gate composing on a resolved key (see FriendThreadScreen)
 * rather than let this silently fail server-side with a 400.
 */
function outgoingKeyFor(group: ChatGroup | undefined, family: FamilyState | null): string | null {
  if (!group) return null;
  if (group.kind === 'friends') return resolvedConvoKeys[group.id] ?? conversationKeyFor(group);
  return family?.e2ee ? activeKeyFor(family.id) : null;
}

/** Recomputes every friends-kind group's key from scratch against the current identity/wraps/group data — see resolvedConvoKeys' comment above for why a full recompute (not incremental patching) is the deliberate choice here. */
function recomputeFriendConvoKeys(groups: Record<string, ChatGroup>): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const g of Object.values(groups)) {
    if (g.kind !== 'friends') continue;
    const key = conversationKeyFor(g);
    if (key) resolved[g.id] = key;
  }
  return resolved;
}

/**
 * Single entry point for upserting ANY group (family or friends-kind) into
 * the store — used by both the realtime `group` WS event and every group-
 * mutating action below (openDm/createFriendGroup/renameGroup/…). Keeps
 * groupsCache in sync and, for a friends-kind group, resolves/refreshes its
 * conversation key and re-maps any now-decryptable locked messages via
 * REDECRYPT_CONVO — same "plain function, bare dispatch" shape as
 * applyIncomingKeyRoll. A no-op beyond the basic upsert for family groups
 * (conversationKeyFor short-circuits on kind !== 'friends').
 */
export function upsertConversation(serverGroup: ServerGroup, dispatch: React.Dispatch<Action>): void {
  const group = toChatGroup(serverGroup);
  dispatch({ type: 'GROUP_UPSERT', group });

  if (myUserId && !group.members.includes(myUserId)) {
    // No longer a member (left, or removed) — drop the cached key material
    // too, so a later re-add starts fresh rather than reusing a stale key.
    const { [group.id]: _g, ...restGroups } = groupsCache;
    groupsCache = restGroups;
    const { [group.id]: _k, ...restKeys } = resolvedConvoKeys;
    resolvedConvoKeys = restKeys;
    return;
  }

  groupsCache = { ...groupsCache, [group.id]: group };
  if (group.kind !== 'friends') return;
  const key = conversationKeyFor(group);
  if (!key || resolvedConvoKeys[group.id] === key) return;
  resolvedConvoKeys = { ...resolvedConvoKeys, [group.id]: key };
  dispatch({ type: 'REDECRYPT_CONVO', keys: { [group.id]: key } });
}

/**
 * GET /sync's friend-conversation slice (full resend every sync, same as
 * `friends` — see chat.js's getSyncSince) — merges the wrapped-key material
 * in BEFORE upserting each group, so upsertConversation's key resolution
 * sees fresh wraps on the very same pass instead of needing a second sync
 * round-trip. Called from useRealtime.ts's sync().
 */
export function applyFriendGroupsSync(friendGroups: ServerGroup[], friendGroupKeys: FriendGroupKey[], dispatch: React.Dispatch<Action>): void {
  friendGroupKeyWraps = {
    ...friendGroupKeyWraps,
    ...Object.fromEntries(friendGroupKeys.map((k) => [k.groupId, { wrapped: k.wrapped, wrappedByPublicKey: k.wrappedByPublicKey }])),
  };
  for (const g of friendGroups) upsertConversation(g, dispatch);
}

/** WS `friendGroupKey` event handler — a member (including possibly this device on a fresh add) just received their wrapped copy of a friend group's key. Mirrors applyIncomingKeyRoll's shape. */
export function applyIncomingFriendGroupKey(
  evt: { groupId: string; wrapped: string; wrappedBy: string; wrappedByPublicKey: string | null },
  dispatch: React.Dispatch<Action>,
): void {
  friendGroupKeyWraps = { ...friendGroupKeyWraps, [evt.groupId]: { wrapped: evt.wrapped, wrappedByPublicKey: evt.wrappedByPublicKey } };
  const group = groupsCache[evt.groupId];
  if (!group) return; // the matching `group` upsert hasn't arrived yet — nothing to key/redecrypt yet
  const key = conversationKeyFor(group);
  if (!key || resolvedConvoKeys[evt.groupId] === key) return;
  resolvedConvoKeys = { ...resolvedConvoKeys, [evt.groupId]: key };
  dispatch({ type: 'REDECRYPT_CONVO', keys: { [evt.groupId]: key } });
}

// ── Server <-> store message mapping ─────────────────────────

export function fromServerMessage(sm: ServerMessage): Message {
  const base = {
    id: sm.id,
    groupId: sm.groupId,
    authorId: sm.authorId,
    kind: sm.kind,
    mediaPath: sm.mediaPath ?? undefined,
    durationMs: sm.durationMs ?? undefined,
    ts: Date.parse(sm.ts),
  };

  if (isEnvelope(sm.body)) {
    const cipher = sm.body as string;
    const group = groupsCache[sm.groupId];

    // Phase V — a friends-kind conversation has its OWN key (see the caches
    // above), never the family ring.
    if (group?.kind === 'friends') {
      const key = resolvedConvoKeys[sm.groupId];
      const decrypted = key ? decryptPayload(key, cipher) : null;
      if (decrypted) {
        return {
          ...base,
          cipher,
          text: decrypted.text,
          loc: decrypted.loc ? { label: decrypted.loc.label, meta: decrypted.loc.meta } : undefined,
          live: decrypted.loc?.live,
        };
      }
      return { ...base, cipher, locked: true };
    }

    // v1 is one family per user, so "the" cached ring (if any) is always the
    // right one to try — no groupId -> familyId lookup available here anyway.
    // Try every key we hold (Phase N — rotation means a message could have
    // been encrypted under any key in the ring, not just the newest).
    const keys = familyKeyRing?.keys ?? [];
    const decrypted = keys.length ? decryptPayloadWithKeys(keys, cipher) : null;
    if (decrypted) {
      return {
        ...base,
        cipher,
        text: decrypted.text,
        loc: decrypted.loc ? { label: decrypted.loc.label, meta: decrypted.loc.meta } : undefined,
        live: decrypted.loc?.live,
      };
    }
    // No key yet, or decrypt failed (tamper/wrong key) — render locked. The
    // envelope is kept as `cipher` either way so a later REDECRYPT pass (once
    // a key loads) or a cold hydrate-from-storage can still try again.
    return { ...base, cipher, locked: true };
  }

  return {
    ...base,
    text: sm.body ?? undefined,
    loc: sm.loc ? { label: sm.loc.label, meta: sm.loc.meta } : undefined,
    live: sm.loc?.live,
  };
}

function toChatGroup(g: ServerGroup): ChatGroup {
  return {
    id: g.id,
    familyId: g.familyId,
    kind: g.kind,
    name: g.name,
    members: g.members,
    memberNames: g.memberNames,
    memberPublicKeys: g.memberPublicKeys,
  };
}

/**
 * Phase P — mirrors fromServerMessage: try every key in the current ring
 * (Phase N rotation means a note could be encrypted under any of them, not
 * just the newest) and unpack `payload.note` on success. `cipher` is kept
 * either way so a later REDECRYPT pass or a cold hydrate-from-storage can
 * still retry once a key loads.
 */
export function fromServerNote(sn: ServerNote): Note {
  const base = {
    id: sn.id,
    familyId: sn.familyId,
    cipher: sn.cipher,
    createdBy: sn.createdBy,
    updatedAt: sn.updatedAt,
    ts: sn.ts,
  };

  const keys = familyKeyRing?.keys ?? [];
  const decrypted = keys.length ? decryptPayloadWithKeys(keys, sn.cipher) : null;
  if (decrypted?.note) {
    return { ...base, title: decrypted.note.title, body: decrypted.note.body };
  }
  return { ...base, locked: true };
}

// ── Actions ──────────────────────────────────────────────────

type Action =
  | { type: 'HYDRATE'; payload: Persisted | null }
  | { type: 'BOOTSTRAP'; payload: BootstrapResponse }
  | { type: 'MERGE_MESSAGES'; messages: Message[] }
  | { type: 'REDECRYPT'; keys: string[] }
  // Phase V — same idea as REDECRYPT, but keyed per-conversation (each
  // friends-kind group has its OWN key, unlike the single family ring) —
  // `keys` maps groupId -> the resolved key, only messages in a matching
  // group are re-attempted.
  | { type: 'REDECRYPT_CONVO'; keys: Record<string, string> }
  | { type: 'MERGE_READ'; groupId: string; userId: string; ts: number }
  | { type: 'GROUP_UPSERT'; group: ChatGroup }
  | { type: 'GROUP_REMOVE'; groupId: string }
  | { type: 'PREPEND_HISTORY'; groupId: string; messages: Message[]; hasMore: boolean }
  | { type: 'SET_LAST_SYNC'; serverTime: string }
  | { type: 'MARK_READ'; groupId: string }
  | { type: 'START_LIVE'; groupId: string; expiresLabel: string }
  | { type: 'STOP_LIVE'; groupId: string }
  | { type: 'FIN_SET'; expenses: ServerExpense[]; transfers: ServerTransfer[]; budget: ServerBudget | null }
  | { type: 'EXPENSE_UPSERT'; expense: ServerExpense }
  | { type: 'EXPENSE_REMOVE'; id: string }
  | { type: 'TRANSFER_UPSERT'; transfer: ServerTransfer }
  | { type: 'BUDGET_UPSERT'; budget: ServerBudget }
  | { type: 'CATEGORY_SET'; categories: ServerCategory[] }
  | { type: 'CATEGORY_UPSERT'; category: ServerCategory }
  | { type: 'CATEGORY_REMOVE'; id: string }
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
  | { type: 'NOTE_SET'; notes: Note[] }
  | { type: 'NOTE_UPSERT'; note: Note }
  | { type: 'NOTE_REMOVE'; id: string }
  | { type: 'ALBUM_SET'; albums: ServerAlbum[] }
  | { type: 'ALBUM_UPSERT'; album: ServerAlbum }
  | { type: 'ALBUM_REMOVE'; id: string }
  | { type: 'PHOTOS_SET'; albumId: string; photos: ServerPhoto[] }
  | { type: 'PHOTO_UPSERT'; photo: ServerPhoto }
  | { type: 'PHOTO_REMOVE'; id: string; albumId: string }
  | { type: 'FRIEND_SET'; friends: Friend[] }
  | { type: 'FRIEND_UPSERT'; friend: Friend }
  | { type: 'SET_IDENTITY_READY'; value: boolean }
  | { type: 'SET_SESSION'; session: Session | null }
  // Phase S — replaces the old single-family SET_FAMILY with three cases for
  // a multi-family world: FAMILY_CONTEXT (full refresh from /me), FAMILY_ACTIVATE
  // (upsert one family — createFamily/joinFamily — and make it active), and
  // SET_ACTIVE_FAMILY (switch among families already known locally).
  | { type: 'FAMILY_CONTEXT'; families: FamilyState[]; activeFamilyId: string | null }
  | { type: 'FAMILY_ACTIVATE'; family: FamilyState }
  | { type: 'SET_ACTIVE_FAMILY'; id: string }
  | { type: 'FAMILY_PATCH'; patch: Partial<FamilyState> & { id: string } }
  | { type: 'SESSION_READY' }
  | { type: 'SET_HAS_KEY'; value: boolean }
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
        ? {
            ...seedState,
            ...action.payload,
            session: state.session,
            families: state.families,
            activeFamilyId: state.activeFamilyId,
            family: state.family,
            sessionReady: state.sessionReady,
            hasFamilyKey: state.hasFamilyKey,
            identityReady: state.identityReady,
            hydrated: true,
          }
        : { ...state, hydrated: true };

    case 'BOOTSTRAP': {
      // Phase V — friend conversations (DMs + friend groups) ride alongside
      // the active family's groups in the same flat `groups`/`messages`/…
      // slices (tagged by `kind`), reusing every existing message/read-
      // cursor/unread code path below instead of a parallel store.
      const allGroups = [...action.payload.groups, ...action.payload.friendGroups];
      const groups: Record<string, ChatGroup> = {};
      for (const g of allGroups) groups[g.id] = toChatGroup(g);

      // Update the module-level friend-conversation-keying caches BEFORE
      // mapping messages below — fromServerMessage() reads groupsCache/
      // resolvedConvoKeys to pick each friends-kind message's decryption key
      // (see that section's header comment for why this lives outside React
      // state, same rationale as familyKeyRing).
      groupsCache = groups;
      friendGroupKeyWraps = Object.fromEntries(
        action.payload.friendGroupKeys.map((k) => [k.groupId, { wrapped: k.wrapped, wrappedByPublicKey: k.wrappedByPublicKey }]),
      );
      resolvedConvoKeys = recomputeFriendConvoKeys(groups);

      const messages: Record<string, Message[]> = {};
      const readCursors: Record<string, Record<string, number>> = {};
      const unread: Record<string, number> = {};
      const hasMore: Record<string, boolean> = {};
      for (const g of allGroups) {
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
        notes: action.payload.notes.map(fromServerNote),
        albums: action.payload.albums,
        photosByAlbum,
        finExpenses: action.payload.expenses,
        finTransfers: action.payload.transfers,
        budget: action.payload.budget,
        categories: action.payload.categories,
        friends: action.payload.friends,
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

    // Phase L — re-maps every locked message holding a `cipher` through
    // decryptPayloadWithKeys now that `keys` is available (see the key-load
    // effect below). Pure/synchronous/no network — this is what lets a
    // cold hydrate-from-storage (where E2EE messages are persisted as
    // ciphertext-only, never plaintext) come back readable offline as soon
    // as the family keyring loads from local keyStorage. Messages that fail
    // to decrypt (still no matching key, tamper) are left untouched.
    // Phase N — `keys` is the whole ring, not one key, so a message that
    // arrived encrypted under a just-rotated-in key (before its roll was
    // applied) unlocks here too, not just messages under the anchor key.
    // Phase P — broadened to also walk `notes` (same cipher/locked shape),
    // so a note hydrated from storage as ciphertext-only, or one that
    // arrived while offline, unlocks the moment the ring is available.
    case 'REDECRYPT': {
      let messagesChanged = false;
      const messages: Record<string, Message[]> = {};
      for (const [groupId, msgs] of Object.entries(state.messages)) {
        let groupChanged = false;
        const next = msgs.map((m) => {
          if (!m.locked || !m.cipher) return m;
          const decrypted = decryptPayloadWithKeys(action.keys, m.cipher);
          if (!decrypted) return m;
          groupChanged = true;
          return {
            ...m,
            locked: undefined,
            text: decrypted.text,
            loc: decrypted.loc ? { label: decrypted.loc.label, meta: decrypted.loc.meta } : undefined,
            live: decrypted.loc?.live,
          };
        });
        messages[groupId] = groupChanged ? next : msgs;
        if (groupChanged) messagesChanged = true;
      }

      let notesChanged = false;
      const notes = state.notes.map((n) => {
        if (!n.locked || !n.cipher) return n;
        const decrypted = decryptPayloadWithKeys(action.keys, n.cipher);
        if (!decrypted?.note) return n;
        notesChanged = true;
        return { ...n, locked: undefined, title: decrypted.note.title, body: decrypted.note.body };
      });

      if (!messagesChanged && !notesChanged) return state;
      return {
        ...state,
        messages: messagesChanged ? messages : state.messages,
        notes: notesChanged ? notes : state.notes,
      };
    }

    // Phase V — same idea as REDECRYPT, but `action.keys` maps groupId ->
    // that ONE conversation's resolved key (each friends-kind conversation
    // has its own key, unlike the single family ring), and only locked
    // messages in a matching group are re-attempted — a single-key
    // decryptPayload, not a ring walk (friend conversations have no
    // rotation in v1: a member-add re-wraps the SAME key, never a new one).
    case 'REDECRYPT_CONVO': {
      let changed = false;
      const messages: Record<string, Message[]> = {};
      for (const [groupId, msgs] of Object.entries(state.messages)) {
        const key = action.keys[groupId];
        if (!key) {
          messages[groupId] = msgs;
          continue;
        }
        let groupChanged = false;
        const next = msgs.map((m) => {
          if (!m.locked || !m.cipher) return m;
          const decrypted = decryptPayload(key, m.cipher);
          if (!decrypted) return m;
          groupChanged = true;
          return {
            ...m,
            locked: undefined,
            text: decrypted.text,
            loc: decrypted.loc ? { label: decrypted.loc.label, meta: decrypted.loc.meta } : undefined,
            live: decrypted.loc?.live,
          };
        });
        messages[groupId] = groupChanged ? next : msgs;
        if (groupChanged) changed = true;
      }
      return changed ? { ...state, messages } : state;
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

    case 'FIN_SET':
      return { ...state, finExpenses: action.expenses, finTransfers: action.transfers, budget: action.budget };

    case 'EXPENSE_UPSERT': {
      const idx = state.finExpenses.findIndex((e) => e.id === action.expense.id);
      const finExpenses = idx >= 0
        ? state.finExpenses.map((e, i) => (i === idx ? action.expense : e))
        : [...state.finExpenses, action.expense];
      return { ...state, finExpenses };
    }

    case 'EXPENSE_REMOVE':
      return { ...state, finExpenses: state.finExpenses.filter((e) => e.id !== action.id) };

    case 'TRANSFER_UPSERT': {
      const idx = state.finTransfers.findIndex((t) => t.id === action.transfer.id);
      const finTransfers = idx >= 0
        ? state.finTransfers.map((t, i) => (i === idx ? action.transfer : t))
        : [...state.finTransfers, action.transfer];
      return { ...state, finTransfers };
    }

    case 'BUDGET_UPSERT':
      return { ...state, budget: action.budget };

    case 'CATEGORY_SET':
      return { ...state, categories: action.categories };

    case 'CATEGORY_UPSERT': {
      const idx = state.categories.findIndex((c) => c.id === action.category.id);
      const categories = idx >= 0
        ? state.categories.map((c, i) => (i === idx ? action.category : c))
        : [...state.categories, action.category];
      return { ...state, categories };
    }

    case 'CATEGORY_REMOVE':
      return { ...state, categories: state.categories.filter((c) => c.id !== action.id) };

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

    case 'NOTE_SET':
      return { ...state, notes: action.notes };

    case 'NOTE_UPSERT': {
      const idx = state.notes.findIndex((n) => n.id === action.note.id);
      const notes = idx >= 0
        ? state.notes.map((n, i) => (i === idx ? action.note : n))
        : [...state.notes, action.note];
      return { ...state, notes };
    }

    case 'NOTE_REMOVE':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.id) };

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

    case 'FRIEND_SET':
      return { ...state, friends: action.friends };

    case 'FRIEND_UPSERT': {
      const idx = state.friends.findIndex((f) => f.id === action.friend.id);
      const friends = idx >= 0
        ? state.friends.map((f, i) => (i === idx ? action.friend : f))
        : [...state.friends, action.friend];
      return { ...state, friends };
    }

    case 'SET_IDENTITY_READY':
      return state.identityReady === action.value ? state : { ...state, identityReady: action.value };

    case 'SET_SESSION':
      return { ...state, session: action.session };

    case 'FAMILY_CONTEXT': {
      // Full refresh from GET /me — authoritative for both "every family I'm
      // in" and "which one is active" (the server already validated the
      // X-Family-Id header against membership, or fell back to the first
      // family — see server.js's resolveFamily).
      const family = action.families.find((f) => f.id === action.activeFamilyId) ?? null;
      return { ...state, families: action.families, activeFamilyId: action.activeFamilyId, family };
    }

    case 'FAMILY_ACTIVATE': {
      // createFamily/joinFamily: upsert the affected family into `families`
      // (a fresh create/create is always new; a re-join of an existing
      // membership is idempotent) and make it the active one.
      const idx = state.families.findIndex((f) => f.id === action.family.id);
      const families = idx >= 0
        ? state.families.map((f, i) => (i === idx ? action.family : f))
        : [...state.families, action.family];
      return { ...state, families, activeFamilyId: action.family.id, family: action.family };
    }

    case 'SET_ACTIVE_FAMILY': {
      // switchFamily: only ever targets a family already present in
      // `families` (the switcher UI only lists known families) — a no-op
      // guard against an unknown id rather than silently going family-less.
      const family = state.families.find((f) => f.id === action.id) ?? null;
      if (!family) return state;
      return { ...state, activeFamilyId: action.id, family };
    }

    case 'FAMILY_PATCH': {
      // Realtime `family` events (member roster changes, e2ee flip, rename)
      // carry only the fields that changed — merge onto whatever family
      // state we already have (both the active `family` and its entry
      // inside `families`) rather than clobbering it.
      const idx = state.families.findIndex((f) => f.id === action.patch.id);
      const families = idx >= 0 ? state.families.map((f, i) => (i === idx ? { ...f, ...action.patch } : f)) : state.families;
      const family = state.family && state.family.id === action.patch.id ? { ...state.family, ...action.patch } : state.family;
      if (families === state.families && family === state.family) return state;
      return { ...state, families, family };
    }

    case 'SESSION_READY':
      return state.sessionReady ? state : { ...state, sessionReady: true };

    case 'SET_HAS_KEY':
      return state.hasFamilyKey === action.value ? state : { ...state, hasFamilyKey: action.value };

    case 'LOGOUT':
      // Clears session+family(s) only — local/cached data stays put (the next
      // login's bootstrap replaces the chat slices wholesale). identityReady
      // resets so a different account logging in on this device re-runs the
      // identity-keypair-exists + publish effect for ITS OWN session, rather
      // than skipping it because a previous user's flag was left true.
      return { ...state, session: null, families: [], activeFamilyId: null, family: null, hasFamilyKey: false, identityReady: false };

    default:
      return state;
  }
}

/**
 * Phase N — apply one incoming key roll (WS `keyroll` event, routed here by
 * useRealtime.ts) to the in-memory ring: fixpoint replay against every key
 * currently held. A plain exported function (not a hook) so the realtime
 * bridge — which only has a bare dispatch, same as fromServerMessage's
 * caller — can call it directly. No-op if we're not tracking a ring for this
 * roll's family, or if the ring already recovers nothing new from it (a
 * duplicate delivery, or a roll wrapped under a key we don't hold yet —
 * that'll resolve on a later roll or the next bootstrap's replay instead).
 */
export function applyIncomingKeyRolls(rolls: { familyId: string; wrapped: string }[], dispatch: React.Dispatch<Action>): void {
  if (!familyKeyRing || !rolls.length) return;
  const familyId = familyKeyRing.familyId;
  const relevant = rolls.filter((r) => r.familyId === familyId);
  if (!relevant.length) return;
  // One fixpoint pass over the WHOLE batch (not per-roll) so a chain like
  // R2=enc(K1,K2) that arrives alongside R1=enc(K0,K1) still resolves — a
  // per-roll loop would apply R2 before K1 exists and never re-attempt it.
  const next = applyKeyRolls(familyKeyRing.keys, relevant);
  if (next === familyKeyRing.keys) return;
  familyKeyRing = { familyId, keys: next };
  keyStorage.setRing(familyId, next).catch((err) => console.warn('[store] key roll persist failed', err));
  dispatch({ type: 'REDECRYPT', keys: next });
}

/** Single-roll convenience for the WS `keyroll` broadcast path (see useRealtime.ts). */
export function applyIncomingKeyRoll(roll: { familyId: string; wrapped: string }, dispatch: React.Dispatch<Action>): void {
  applyIncomingKeyRolls([roll], dispatch);
}

// ── Context ──────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

// Module-level (not per-provider-instance) so it survives re-renders without
// extra state: the last read-cursor ts we actually POSTed per group. Guards
// markRead() below against network spam — ThreadScreen calls markRead() on
// every `msgs.length` change while focused, but once we've already posted a
// cursor at/after the newest message's ts, re-posting the same "caught up"
// state on every subsequent render is pure waste.
const lastPostedReadTs = new Map<string, number>();

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
  //
  // Phase L — E2EE messages must never hit AsyncStorage/localStorage
  // decrypted: any message holding a `cipher` (its wire body was an
  // envelope — see fromServerMessage) is stripped down to ciphertext +
  // metadata only (id/groupId/authorId/kind/ts/cipher, forced `locked:
  // true`) before it's serialized, same as if we'd never had the key. The
  // REDECRYPT reducer action re-maps these back through decryptPayloadWithKeys
  // the next time familyKeyRing is populated (see the key-load effect below)
  // — that's what keeps offline reads working despite storage holding only
  // ciphertext.
  // Phase P — notes get the exact same treatment as messages above: any note
  // holding a `cipher` is stripped down to ciphertext + metadata only before
  // it's serialized, never persisting decrypted title/body. REDECRYPT re-maps
  // these back the next time familyKeyRing is populated (see the key-load
  // effect below).
  useEffect(() => {
    if (!state.hydrated) return;
    const {
      hydrated: _hydrated,
      session: _session,
      families: _families,
      activeFamilyId: _activeFamilyId,
      family: _family,
      sessionReady: _sessionReady,
      hasFamilyKey: _hasFamilyKey,
      identityReady: _identityReady,
      ...persisted
    } = state;
    const messages: Record<string, Message[]> = {};
    for (const [groupId, msgs] of Object.entries(persisted.messages)) {
      messages[groupId] = msgs.map((m) =>
        m.cipher
          ? { id: m.id, groupId: m.groupId, authorId: m.authorId, kind: m.kind, ts: m.ts, cipher: m.cipher, locked: true }
          : m,
      );
    }
    const notes: Note[] = persisted.notes.map((n) =>
      n.cipher
        ? { id: n.id, familyId: n.familyId, cipher: n.cipher, locked: true, createdBy: n.createdBy, updatedAt: n.updatedAt, ts: n.ts }
        : n,
    );
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...persisted, messages, notes })).catch(() => {});
  }, [state]);

  // Load the session token once on mount and, if present, hydrate session +
  // families/active-family from the server. A missing/expired/invalid token
  // is a silent fail → logged out.
  //
  // Phase S — reads the last-chosen active family id (its own small
  // AsyncStorage key, not the generic Persisted blob — see ACTIVE_FAMILY_KEY's
  // comment) and pushes it into api/client.ts's module-level setter BEFORE
  // calling getMe(), so a cold relaunch's very first request already carries
  // the right X-Family-Id header instead of falling back to "first family"
  // and only correcting itself after this resolves. The server re-validates
  // membership regardless (see resolveFamily), so a stale/foreign id here is
  // harmless — worst case it just falls back the same way a missing header would.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await tokenStorage.get();
        if (!token || cancelled) return;
        const persistedActiveFamilyId = await AsyncStorage.getItem(ACTIVE_FAMILY_KEY).catch(() => null);
        if (persistedActiveFamilyId) apiSetActiveFamilyId(persistedActiveFamilyId);
        const { user, families, activeFamilyId } = await getMe(token);
        if (cancelled) return;
        dispatch({ type: 'SET_SESSION', session: { token, userId: user.id, username: user.username, name: user.name } });
        dispatch({ type: 'FAMILY_CONTEXT', families: families.map(toFamilyState), activeFamilyId });
        apiSetActiveFamilyId(activeFamilyId);
        if (activeFamilyId) await AsyncStorage.setItem(ACTIVE_FAMILY_KEY, activeFamilyId).catch(() => {});
        else await AsyncStorage.removeItem(ACTIVE_FAMILY_KEY).catch(() => {});
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

  // Phase U — ensure this device holds a Friends identity keypair (generating
  // one on first use) and that its public key is published to the server,
  // whenever a session becomes available. Idempotent both locally (identity
  // keypair persists in SecureStore across app restarts — generated at most
  // once per device) and server-side (publishKey is an upsert), so re-running
  // this on every fresh login/relaunch is always safe. The private key never
  // leaves this effect's own device — only publicB64 goes over the wire.
  useEffect(() => {
    const token = state.session?.token;
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        let keypair = await identityKeyStorage.get();
        if (!keypair) {
          keypair = generateIdentityKeypair();
          await identityKeyStorage.set(keypair);
        }
        if (cancelled) return;
        await apiPublishKey(token, keypair.pubB64);
        if (cancelled) return;
        // Phase V — populate the module-level identity cache that
        // conversationKeyFor()/fromServerMessage() read from (mirrors
        // familyKeyRing's "module-level for a non-hook reader" rationale),
        // then re-resolve every friends-kind conversation already in
        // groupsCache (bootstrap may have already populated it before this
        // resolved — order between the two async effects isn't guaranteed
        // either way) and unlock any newly-decryptable messages.
        myIdentity = keypair;
        myUserId = state.session?.userId ?? null;
        const resolved = recomputeFriendConvoKeys(groupsCache);
        resolvedConvoKeys = resolved;
        dispatch({ type: 'SET_IDENTITY_READY', value: true });
        if (Object.keys(resolved).length) dispatch({ type: 'REDECRYPT_CONVO', keys: resolved });
      } catch (err) {
        console.warn('[store] identity key publish failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.session?.token]);

  // Phase K/N — hydrate the E2EE keyring cache whenever the current family
  // changes (fresh login into a family, or create/join within this session).
  // This local storage read usually resolves well before the bootstrap
  // effect's network fetch above, so messages typically decrypt on the very
  // first BOOTSTRAP dispatch. If it doesn't win that race, re-running
  // bootstrap once here (only when a ring was actually found) re-maps
  // everything through fromServerMessage now that the cache is populated —
  // cheap, and only ever happens for families the user already holds a key
  // for. That same re-fetch also carries `keyRolls`, which get fixpoint-
  // replayed against the loaded ring (see applyKeyRolls) — this is what lets
  // a member who missed a rotation while offline (or a brand-new member who
  // joined with only the original invite key) recover every subsequent key
  // without re-entering anything.
  useEffect(() => {
    const familyId = state.family?.id;
    if (!familyId) {
      familyKeyRing = null;
      dispatch({ type: 'SET_HAS_KEY', value: false });
      return;
    }
    let cancelled = false;
    keyStorage
      .getRing(familyId)
      .then((keys) => {
        if (cancelled) return;
        if (!keys || !keys.length) {
          familyKeyRing = null;
          dispatch({ type: 'SET_HAS_KEY', value: false });
          return;
        }
        familyKeyRing = { familyId, keys };
        dispatch({ type: 'SET_HAS_KEY', value: true });
        // Phase L — messages hydrated from storage (persisted as
        // ciphertext-only, see the persist effect above) come back `locked`
        // regardless of whether we held the ring last session. Re-map them
        // through decryptPayloadWithKeys right away — synchronous, no
        // network — so offline reads work even if the bootstrap re-fetch
        // below never completes (no connectivity).
        dispatch({ type: 'REDECRYPT', keys });
        const token = state.session?.token;
        if (token) {
          getBootstrap(token)
            .then((payload) => {
              if (cancelled) return;
              dispatch({ type: 'BOOTSTRAP', payload });
              // Phase N — replay any rolls this ring hasn't absorbed yet.
              if (!familyKeyRing || familyKeyRing.familyId !== familyId) return;
              const grown = applyKeyRolls(familyKeyRing.keys, payload.keyRolls);
              if (grown === familyKeyRing.keys) return;
              familyKeyRing = { familyId, keys: grown };
              keyStorage.setRing(familyId, grown).catch((err) => console.warn('[store] keyring persist failed', err));
              dispatch({ type: 'REDECRYPT', keys: grown });
            })
            .catch((err) => console.warn('[store] re-bootstrap after key load failed', err));
        }
      })
      .catch((err) => {
        console.warn('[store] key hydration failed', err);
        if (!cancelled) {
          familyKeyRing = null;
          dispatch({ type: 'SET_HAS_KEY', value: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [state.family?.id]);

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
      // Optimistic local message always stores plaintext (so the sender sees
      // their own text/location immediately) — only the wire body is ever
      // enveloped, and only when the family has e2ee on AND we actually hold
      // its ring (the familyId guard defends against a stale cache entry).
      // Encrypts under the ring's ACTIVE key (the last one — see
      // activeKeyFor) so a rotation immediately takes effect for new sends.
      sendMessage: (groupId: string, text: string) => {
        const authorId = state.session?.userId;
        if (!authorId) return;
        const id = uid();
        const msg: Message = { id, groupId, authorId, kind: 'text', text, ts: Date.now() };
        dispatch({ type: 'MERGE_MESSAGES', messages: [msg] });
        if (!token) return;
        const key = outgoingKeyFor(state.groups[groupId], state.family);
        const bodyPromise = key ? encryptPayload(key, { text }) : Promise.resolve(text);
        bodyPromise
          .then((body) => postMessage(token, groupId, { id, kind: 'text', body }))
          .catch((err) => console.warn('[store] sendMessage failed', err));
      },

      sendLocation: (groupId: string, label: string, meta: string, live?: boolean) => {
        const authorId = state.session?.userId;
        if (!authorId) return;
        const id = uid();
        const loc = { label, meta };
        const msg: Message = { id, groupId, authorId, kind: 'loc', loc, live, ts: Date.now() };
        dispatch({ type: 'MERGE_MESSAGES', messages: [msg] });
        if (!token) return;
        const key = outgoingKeyFor(state.groups[groupId], state.family);
        if (key) {
          // Encrypted loc rides inside the envelope body — the server's `loc`
          // column stays NULL for this message (see chat.js's createMessage).
          encryptPayload(key, { loc: { ...loc, live } })
            .then((body) => postMessage(token, groupId, { id, kind: 'loc', body }))
            .catch((err) => console.warn('[store] sendLocation failed', err));
        } else {
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
        if (!token) return;
        // Skip the POST once we've already told the server we're caught up
        // to the newest message — avoids re-posting a read cursor on every
        // `msgs.length` re-render while the thread stays focused (see
        // lastPostedReadTs above).
        const msgs = state.messages[groupId];
        const newestTs = msgs?.length ? msgs[msgs.length - 1].ts : 0;
        if ((lastPostedReadTs.get(groupId) ?? 0) >= newestTs) return;
        lastPostedReadTs.set(groupId, now);
        postRead(token, groupId, new Date(now).toISOString()).catch((err) => console.warn('[store] markRead failed', err));
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

      // ── Family Finance ────────────────────────────────────────

      addExpense: (input: {
        label: string;
        /** A built-in CategoryId or a custom expense_categories.id (Phase R). */
        categoryId: string;
        amount: number;
        paidBy: string;
        splitAmong: string[];
        receiptPath?: string;
      }) => {
        const userId = state.session?.userId;
        if (!userId) return;
        const id = uid();
        const expense: ServerExpense = {
          id,
          familyId: state.family?.id ?? '',
          label: input.label,
          categoryId: input.categoryId,
          amount: input.amount,
          paidBy: input.paidBy,
          splitAmong: input.splitAmong,
          receiptPath: input.receiptPath ?? null,
          createdBy: userId,
          ts: new Date().toISOString(),
        };
        dispatch({ type: 'EXPENSE_UPSERT', expense });
        if (token) {
          apiAddExpense(token, {
            id,
            label: input.label,
            categoryId: input.categoryId,
            amount: input.amount,
            paidBy: input.paidBy,
            splitAmong: input.splitAmong,
            receiptPath: input.receiptPath,
          }).catch((err) => console.warn('[store] addExpense failed', err));
        }
      },

      removeExpense: (id: string) => {
        dispatch({ type: 'EXPENSE_REMOVE', id });
        if (token) apiRemoveExpense(token, id).catch((err) => console.warn('[store] removeExpense failed', err));
      },

      /** I pay `amount` to `toId`, zeroing (part of) what I owe them. */
      settleUp: (toId: string, amount: number) => {
        const userId = state.session?.userId;
        if (!userId) return;
        const id = uid();
        const transfer: ServerTransfer = { id, familyId: state.family?.id ?? '', fromId: userId, toId, amount, ts: new Date().toISOString() };
        dispatch({ type: 'TRANSFER_UPSERT', transfer });
        if (token) apiAddTransfer(token, { id, toId, amount }).catch((err) => console.warn('[store] settleUp failed', err));
      },

      /** Sets the current month's budget. */
      setBudget: (amount: number) => {
        const budget: ServerBudget = { month: monthKey(), amount, familyId: state.family?.id ?? '' };
        dispatch({ type: 'BUDGET_UPSERT', budget });
        if (token) apiPutBudget(token, { amount }).catch((err) => console.warn('[store] setBudget failed', err));
      },

      /** Pushes a "you owe" reminder to `toId`. Rejects on failure so the screen can show/clear a "Reminded ✓" state. */
      remindPayment: async (toId: string, amount: number): Promise<void> => {
        if (!token) throw new Error('not signed in');
        await apiRemindPayment(token, { toUserId: toId, amount });
      },

      /** Upload a receipt photo for manual expense entry — returns its stored path. */
      uploadReceipt: async (image: UploadFile): Promise<{ receiptPath: string }> => {
        if (!token) throw new Error('not signed in');
        return apiUploadReceipt(token, image);
      },

      // ── Custom expense categories (Phase R) ───────────────────

      /** Adds a family-scoped custom expense category on top of the 5 built-ins. Not optimistic (the id must survive a built-in/uniqueness check server-side) — resolves once the server confirms, and CATEGORY_UPSERT lands again via the `category` WS broadcast for other members. */
      addCategory: async (input: { label: string; icon: string; color: string; income?: boolean }): Promise<ServerCategory> => {
        if (!token) throw new Error('not signed in');
        const id = uid();
        const { category } = await apiAddCategory(token, { id, label: input.label, icon: input.icon, color: input.color, income: input.income });
        dispatch({ type: 'CATEGORY_UPSERT', category });
        return category;
      },

      removeCategory: (id: string) => {
        dispatch({ type: 'CATEGORY_REMOVE', id });
        if (token) apiRemoveCategory(token, id).catch((err) => console.warn('[store] removeCategory failed', err));
      },

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

      addTask: (input: { title: string; notes?: string; assigneeId?: string; dueDate?: string; recurrence?: TaskRecurrence | null }) => {
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
          recurrence: input.recurrence ?? null,
        };
        dispatch({ type: 'TASK_UPSERT', task });
        if (token) {
          addTaskItem(token, {
            id,
            title: input.title,
            notes: input.notes,
            assigneeId: input.assigneeId,
            dueDate: input.dueDate,
            recurrence: input.recurrence ?? null,
          }).catch((err) => console.warn('[store] addTask failed', err));
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
              ...(patch.recurrence !== undefined ? { recurrence: patch.recurrence } : {}),
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

      // ── Shared Notes (Phase P — E2EE) ─────────────────────────
      //
      // Notes are ALWAYS encrypted (families are born e2ee — see FamilyState
      // — there's no plaintext fallback like messages have pre-Phase-K). The
      // family.e2ee + activeKeyFor guard mirrors sendMessage/sendLocation's
      // encrypted path: without a key this device can't produce a valid
      // envelope, so writes are simply refused (screens should already be
      // gating the UI on useE2EE().hasKey — see NotesScreen).
      //
      // Unlike sendMessage (which relies on the WS `message` broadcast to
      // eventually deliver the real ciphertext back to the sender), add/
      // updateNote re-dispatch straight off the POST/PATCH response. That's
      // not just an optimization: the optimistic entry's `cipher` is a ''
      // placeholder (Note.cipher is non-optional — every note is encrypted,
      // there's no plaintext-note shape to fall back to), so it MUST be
      // replaced with the real envelope before this note is safe to persist
      // or REDECRYPT — same "fill in the real thing from the response" need
      // as sendVoice's follow-up MERGE_MESSAGES after its upload resolves.

      addNote: (title: string, body: string) => {
        const userId = state.session?.userId;
        const familyId = state.family?.id;
        if (!userId || !familyId || !token) return;
        const key = state.family?.e2ee ? activeKeyFor(familyId) : null;
        if (!key) return; // no family key on this device yet — can't encrypt
        const id = uid();
        const now = new Date().toISOString();
        const note: Note = { id, familyId, title, body, cipher: '', createdBy: userId, updatedAt: now, ts: now };
        dispatch({ type: 'NOTE_UPSERT', note });
        encryptPayload(key, { note: { title, body } })
          .then((cipher) => apiAddNote(token, { id, cipher }))
          .then(({ note: sn }) => dispatch({ type: 'NOTE_UPSERT', note: fromServerNote(sn) }))
          .catch((err) => console.warn('[store] addNote failed', err));
      },

      updateNote: (id: string, title: string, body: string) => {
        const familyId = state.family?.id;
        if (!familyId || !token) return;
        const key = state.family?.e2ee ? activeKeyFor(familyId) : null;
        if (!key) return;
        const current = state.notes.find((n) => n.id === id);
        if (current) {
          dispatch({ type: 'NOTE_UPSERT', note: { ...current, title, body, updatedAt: new Date().toISOString() } });
        }
        encryptPayload(key, { note: { title, body } })
          .then((cipher) => apiUpdateNote(token, id, cipher))
          .then(({ note: sn }) => dispatch({ type: 'NOTE_UPSERT', note: fromServerNote(sn) }))
          .catch((err) => console.warn('[store] updateNote failed', err));
      },

      removeNote: (id: string) => {
        dispatch({ type: 'NOTE_REMOVE', id });
        if (token) apiRemoveNote(token, id).catch((err) => console.warn('[store] removeNote failed', err));
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

      /** Log in an existing user, persist the token, and hydrate families + active family. */
      login: async (username: string, password: string) => {
        const { token: newToken, user } = await authLogin({ username, password });
        await tokenStorage.set(newToken);
        dispatch({ type: 'SET_SESSION', session: { token: newToken, userId: user.id, username: user.username, name: user.name } });
        try {
          const me = await getMe(newToken);
          dispatch({ type: 'FAMILY_CONTEXT', families: me.families.map(toFamilyState), activeFamilyId: me.activeFamilyId });
          apiSetActiveFamilyId(me.activeFamilyId);
          if (me.activeFamilyId) await AsyncStorage.setItem(ACTIVE_FAMILY_KEY, me.activeFamilyId).catch(() => {});
          else await AsyncStorage.removeItem(ACTIVE_FAMILY_KEY).catch(() => {});
        } catch {
          dispatch({ type: 'FAMILY_CONTEXT', families: [], activeFamilyId: null });
        }
      },

      /** Register a new user, then log them in immediately (register has no session of its own). */
      register: async (username: string, password: string, name: string) => {
        await authRegister({ username, password, name });
        const { token: newToken, user } = await authLogin({ username, password });
        await tokenStorage.set(newToken);
        dispatch({ type: 'SET_SESSION', session: { token: newToken, userId: user.id, username: user.username, name: user.name } });
        dispatch({ type: 'FAMILY_CONTEXT', families: [], activeFamilyId: null }); // brand-new account: never in a family yet
      },

      /** Log out: best-effort server-side session revoke, then always clear local state. */
      logout: async () => {
        try {
          if (token) await authLogout(token);
        } catch {
          // Non-fatal — the token may already be expired/gone server-side.
        }
        await tokenStorage.clear().catch(() => {});
        await AsyncStorage.removeItem(ACTIVE_FAMILY_KEY).catch(() => {});
        familyKeyRing = null;
        // Phase V — clear every friend-conversation keying cache too, same
        // rationale as familyKeyRing: the next login's identity-ready effect
        // + bootstrap re-populate them from scratch for whichever account
        // signs in next.
        myIdentity = null;
        myUserId = null;
        groupsCache = {};
        friendGroupKeyWraps = {};
        resolvedConvoKeys = {};
        apiSetActiveFamilyId(null);
        dispatch({ type: 'LOGOUT' });
      },

      /**
       * Families are born E2EE — the server sets `e2ee: true` on the INSERT
       * itself (no opt-in, no separate enable call). This just generates the
       * local key and stores it (as a fresh one-element ring — index 0, the
       * anchor) before ever exposing the family to the UI. Returns the raw
       * key alongside the family so the caller can show/share the extended
       * invite immediately — it's never retrievable from the server again.
       */
      // Phase S — a user may already belong to other families when calling
      // this (createFamily/joinFamily reachable as "add another family" from
      // FamilyHub/YouScreen, not just family-less onboarding). Either way the
      // newly created/joined family becomes the active one immediately —
      // FAMILY_ACTIVATE both appends/updates it in `families` and switches
      // `activeFamilyId`/`family` to it, and we push that to api/client.ts's
      // header setter + persist it, same as switchFamily below.
      createFamily: async (name: string): Promise<{ family: FamilyState; keyB64: string }> => {
        if (!token) throw new Error('not signed in');
        const info = await apiCreateFamily(token, name);
        const familyId = info.family.id;
        const keyB64 = await generateFamilyKey();
        await keyStorage.setRing(familyId, [keyB64]);
        familyKeyRing = { familyId, keys: [keyB64] };
        dispatch({ type: 'SET_HAS_KEY', value: true });
        const family = toFamilyState(info);
        dispatch({ type: 'FAMILY_ACTIVATE', family });
        apiSetActiveFamilyId(familyId);
        await AsyncStorage.setItem(ACTIVE_FAMILY_KEY, familyId).catch(() => {});
        return { family, keyB64 };
      },

      /** `keyB64` comes from parseInvite() when the pasted invite was the extended form (`CODE#K1.<key>`) — always the ORIGINAL anchor key, even for a family that's since rotated; the key-load effect's bootstrap replay walks the roll chain to rebuild the rest of the ring. */
      joinFamily: async (code: string, keyB64?: string) => {
        if (!token) throw new Error('not signed in');
        const info = await apiJoinFamily(token, code);
        const family = toFamilyState(info);
        if (keyB64) {
          await keyStorage.setRing(family.id, [keyB64]);
          familyKeyRing = { familyId: family.id, keys: [keyB64] };
          dispatch({ type: 'SET_HAS_KEY', value: true });
        }
        dispatch({ type: 'FAMILY_ACTIVATE', family });
        apiSetActiveFamilyId(family.id);
        await AsyncStorage.setItem(ACTIVE_FAMILY_KEY, family.id).catch(() => {});
      },

      /**
       * Phase S — switch the active family among ones the session user
       * already belongs to (the switcher UI only ever offers `state.families`
       * entries). Sets the new active family, pushes it to api/client.ts's
       * header setter, persists the choice, and re-bootstraps to replace the
       * flat slices (messages/groups/grocery/tasks/events/albums/finance/
       * categories/notes) with the new family's data. The E2EE keyring
       * reload is handled by the existing key-load effect (keyed on
       * state.family?.id, which this changes) — not duplicated here.
       */
      switchFamily: async (id: string): Promise<void> => {
        if (!token) throw new Error('not signed in');
        if (id === state.activeFamilyId) return;
        if (!state.families.some((f) => f.id === id)) throw new Error('not a member of that family');
        dispatch({ type: 'SET_ACTIVE_FAMILY', id });
        apiSetActiveFamilyId(id);
        await AsyncStorage.setItem(ACTIVE_FAMILY_KEY, id).catch(() => {});
        try {
          const payload = await getBootstrap(token);
          dispatch({ type: 'BOOTSTRAP', payload });
        } catch (err) {
          console.warn('[store] switchFamily bootstrap failed', err);
        }
      },

      /**
       * "Enter your family key" flow: accepts either a full extended invite
       * or a bare pasted key, stores it as a fresh one-element ring, then
       * re-runs bootstrap so every currently-locked message re-maps through
       * fromServerMessage with the now-populated cache (and so any key rolls
       * since this key was issued get fixpoint-replayed — see the key-load
       * effect, which this same family-id state also feeds).
       */
      importFamilyKey: async (input: string): Promise<void> => {
        if (!state.family) throw new Error('not in a family');
        const keyB64 = parseKeyInput(input);
        if (!keyB64) throw new Error("That doesn't look like a valid family key");
        const familyId = state.family.id;
        await keyStorage.setRing(familyId, [keyB64]);
        familyKeyRing = { familyId, keys: [keyB64] };
        dispatch({ type: 'SET_HAS_KEY', value: true });
        if (token) {
          const payload = await getBootstrap(token);
          dispatch({ type: 'BOOTSTRAP', payload });
        }
      },

      /**
       * Owner-only key rotation (enforced in the UI — see YouScreen.tsx —
       * not here; the server doesn't care who calls this either, since every
       * current member already holds the full key history regardless). Wraps
       * a freshly generated key under the current active key, posts it, then
       * appends it locally — the new key becomes active immediately for this
       * device's own outgoing messages. Other members pick it up via the WS
       * `keyroll` broadcast (applyIncomingKeyRoll) or, if offline, the next
       * bootstrap's fixpoint replay.
       */
      rotateKey: async (): Promise<void> => {
        if (!token || !state.family) throw new Error('not signed in');
        const familyId = state.family.id;
        if (!familyKeyRing || familyKeyRing.familyId !== familyId || !familyKeyRing.keys.length) {
          throw new Error("This device doesn't hold the family key yet");
        }
        const prevActive = familyKeyRing.keys[familyKeyRing.keys.length - 1];
        const newKey = await generateFamilyKey();
        const wrapped = await wrapKey(prevActive, newKey);
        await postKeyRoll(token, familyId, wrapped);
        const keys = [...familyKeyRing.keys, newKey];
        familyKeyRing = { familyId, keys };
        await keyStorage.setRing(familyId, keys);
      },

      // ── Friends (Phase U) ─────────────────────────────────────

      /**
       * My own shareable QR/typed-code payload (`fc:1:<userId>.<token>.<pub>`).
       * Fetches fresh token/key material from the server each call so the code
       * shown is always the currently-valid one.
       */
      getMyFriendCode: async (): Promise<string> => {
        if (!token) throw new Error('not signed in');
        const code = await getFriendCode(token);
        return buildFriendCode({ userId: code.userId, friendToken: code.friendToken, pubKeyB64: code.publicKey });
      },

      /**
       * Instant-connect from a scanned/typed friend code (see
       * crypto/friends.ts's parseFriendCode — the caller parses the raw
       * `fc:1:…` string before calling this). Reads this device's own
       * identity keypair (guaranteed to exist once identityReady is true —
       * see the identity-ready effect above) to supply myPublicKey, then
       * upserts the returned friend into the store; the other side gets the
       * same upsert via the `friend` WS broadcast (see useRealtime.ts).
       */
      connectFriend: async (payload: { friendId: string; token: string }): Promise<Friend> => {
        if (!token) throw new Error('not signed in');
        const keypair = await identityKeyStorage.get();
        if (!keypair) throw new Error("This device doesn't have an identity key yet — try again in a moment");
        const { friend } = await apiConnectByQr(token, { friendId: payload.friendId, token: payload.token, myPublicKey: keypair.pubB64 });
        dispatch({ type: 'FRIEND_UPSERT', friend });
        return friend;
      },

      // ── Friend chat: 1:1 DMs + friend groups (Phase V) ─────────
      //
      // Friend conversations live in the SAME `groups`/`messages`/… slices as
      // family chat (tagged `kind: 'friends'`) — see upsertConversation's
      // header comment. Every mutation below routes its server response
      // through upsertConversation instead of a bare GROUP_UPSERT dispatch,
      // so the module-level keying caches (groupsCache/resolvedConvoKeys)
      // stay in sync and any newly-decryptable messages get REDECRYPT_CONVO'd.

      /** Finds or creates the 1:1 DM with a friend — idempotent (calling it again just returns the same conversation). */
      openDm: async (friendId: string): Promise<ChatGroup> => {
        if (!token) throw new Error('not signed in');
        const { group } = await apiOpenDm(token, friendId);
        upsertConversation(group, dispatch);
        return toChatGroup(group);
      },

      /**
       * Creates a friend group: generates a random 32-byte key client-side
       * and wraps a copy to EVERY member (including the creator) under that
       * member's pairwise X25519 DH secret — the exact Phase N key-roll
       * construction, just keyed by deriveSharedKey instead of a previous
       * family key. The server only ever sees the wrapped (ciphertext) copies.
       */
      createFriendGroup: async (name: string, memberIds: string[]): Promise<ChatGroup> => {
        if (!token || !state.session) throw new Error('not signed in');
        if (!myIdentity) throw new Error("This device doesn't have an identity key yet — try again in a moment");
        const myId = state.session.userId;
        const allMembers = [...new Set([myId, ...memberIds])];
        const groupKey = await generateFamilyKey();
        const wrappedKeys: Record<string, string> = {};
        for (const memberId of allMembers) {
          const memberPub = memberId === myId ? myIdentity.pubB64 : state.friends.find((f) => f.id === memberId)?.publicKey;
          if (!memberPub) throw new Error("Missing a selected friend's public key — ask them to reopen the app and try again");
          const pairwise = deriveSharedKey(myIdentity.privB64, memberPub);
          wrappedKeys[memberId] = await wrapKey(pairwise, groupKey);
        }
        const { group } = await apiCreateFriendGroup(token, { name, memberIds, wrappedKeys });
        // I already hold the plaintext key — seed the cache directly instead
        // of round-tripping through an unwrap (equivalent result either way).
        resolvedConvoKeys = { ...resolvedConvoKeys, [group.id]: groupKey };
        upsertConversation(group, dispatch);
        return toChatGroup(group);
      },

      renameFriendGroup: async (groupId: string, name: string) => {
        if (!token) throw new Error('not signed in');
        const { group } = await apiRenameFriendGroup(token, groupId, name);
        upsertConversation(group, dispatch);
      },

      /** Adds a friend to an existing friend group — wraps the CURRENT group key to them under our pairwise DH secret (mirrors Phase N: any current key holder can extend access to a newcomer). */
      addFriendGroupMember: async (groupId: string, memberId: string) => {
        if (!token || !myIdentity) throw new Error("This device isn't ready yet — try again in a moment");
        const group = state.groups[groupId];
        const groupKey = group ? resolvedConvoKeys[groupId] ?? conversationKeyFor(group) : undefined;
        if (!group || !groupKey) throw new Error("This device doesn't hold this conversation's key yet");
        const memberPub = state.friends.find((f) => f.id === memberId)?.publicKey;
        if (!memberPub) throw new Error("Missing that friend's public key — ask them to reopen the app and try again");
        const pairwise = deriveSharedKey(myIdentity.privB64, memberPub);
        const wrapped = await wrapKey(pairwise, groupKey);
        const { group: updated } = await apiAddFriendGroupMember(token, groupId, { memberId, wrapped });
        upsertConversation(updated, dispatch);
      },

      leaveFriendGroup: async (groupId: string) => {
        if (!token) throw new Error('not signed in');
        await apiLeaveFriendGroup(token, groupId);
        dispatch({ type: 'GROUP_REMOVE', groupId });
        const { [groupId]: _g, ...restGroups } = groupsCache;
        groupsCache = restGroups;
        const { [groupId]: _k, ...restKeys } = resolvedConvoKeys;
        resolvedConvoKeys = restKeys;
      },
    }),
    [dispatch, token, state.session, state.family, state.families, state.activeFamilyId, state.messages, state.grocery, state.tasks, state.events, state.notes, state.albums, state.groups, state.friends],
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
  if (m.locked) return `${who}🔒 Message`;
  if (m.kind === 'loc') return `${who}📍 ${m.loc?.label ?? 'shared a location'}`;
  if (m.kind === 'voice') return `${who}🎤 Voice message`;
  return `${who}${m.text ?? ''}`.trim();
}

export function useChatRows(): ChatRow[] {
  const { state } = useCtx();
  return useMemo(() => {
    const myId = state.session?.userId;
    const nameOf = (id: string) => state.family?.members.find((m) => m.id === id)?.name ?? id;
    // Phase V — friend conversations live in the same `groups` slice (tagged
    // `kind`) but have their own tab/list (FriendsListScreen) — exclude them
    // here so they don't also show up in the family Chats tab.
    const rows = Object.values(state.groups)
      .filter((g) => g.kind !== 'friends')
      .map((g): ChatRow & { _lastTs: number } => {
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

/** A friends-kind group's display name: a DM (<=2 members) shows the OTHER member's name (there's no meaningful single "group name" for two people — see friendChat.js's openDm); a named friend group shows its own name. */
export function friendConvoDisplayName(g: ChatGroup, myId: string | undefined): string {
  if (g.members.length <= 2) {
    const otherId = g.members.find((id) => id !== myId);
    const otherName = otherId ? g.memberNames?.[otherId] : undefined;
    if (otherName) return otherName;
  }
  return g.name;
}

/** Phase V — every friend conversation (1:1 DMs + friend groups) as chat-list rows, same shape/sort as useChatRows() — drives the Friends tab's conversation list. */
export function useFriendChatRows(): ChatRow[] {
  const { state } = useCtx();
  return useMemo(() => {
    const myId = state.session?.userId;
    const rows = Object.values(state.groups)
      .filter((g) => g.kind === 'friends')
      .map((g): ChatRow & { _lastTs: number } => {
        const msgs = state.messages[g.id];
        const last = msgs && msgs.length ? msgs[msgs.length - 1] : undefined;
        const nameOf = (id: string) => g.memberNames?.[id] ?? id;
        return {
          id: g.id,
          name: friendConvoDisplayName(g, myId),
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
  }, [state.groups, state.messages, state.unread, state.live, state.session]);
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

/** Family Finance: expenses/transfers/budget slices + a memoized ledger summary + monthly budget math. */
export interface FinanceState {
  expenses: ServerExpense[];
  transfers: ServerTransfer[];
  budget: ServerBudget | null;
  summary: FinanceSummary;
  /** Sum of this month's spend-category expenses (refunds excluded, not subtracted). */
  spent: number;
  /** budget.amount - spent (0 if no budget set yet); negative when over budget. */
  remaining: number;
}

export function useFinance(): FinanceState {
  const { state } = useCtx();
  const memberIds = useMemo(() => state.family?.members.map((m) => m.id) ?? [], [state.family]);
  const summary = useMemo(
    () => summarizeFinance(state.finExpenses, state.finTransfers, memberIds, state.categories),
    [state.finExpenses, state.finTransfers, memberIds, state.categories],
  );
  const spent = useMemo(() => {
    const month = monthKey();
    return state.finExpenses
      .filter((e) => !resolveCategory(e.categoryId, state.categories).income && monthKey(new Date(e.ts)) === month)
      .reduce((s, e) => s + e.amount, 0);
  }, [state.finExpenses, state.categories]);
  const remaining = (state.budget?.amount ?? 0) - spent;
  return { expenses: state.finExpenses, transfers: state.finTransfers, budget: state.budget, summary, spent, remaining };
}

/** The 5 built-in categories merged with the family's server-backed custom ones — the full display-ready set for category pickers/lookups (see FinanceScreen). Built-ins first, then custom in creation order. */
export function useCategories(): CategoryMeta[] {
  const { state } = useCtx();
  return useMemo(() => [...CATEGORIES, ...state.categories], [state.categories]);
}

export function useHydrated(): boolean {
  return useCtx().state.hydrated;
}

/** The signed-in user, or null when logged out. */
export function useSession(): Session | null {
  return useCtx().state.session;
}

/** The session user's ACTIVE Family Space, or null until they create/join one. */
export function useFamily(): FamilyState | null {
  return useCtx().state.family;
}

/** Phase S — every family the session user belongs to (unsorted — server orders by joined_at). Empty until /me resolves. */
export function useFamilies(): FamilyState[] {
  return useCtx().state.families;
}

/** Phase S — the active family's id, or null if the user isn't in any family yet. Mirrors useFamily()?.id but stays non-null-checked against `families` even before that lookup resolves. */
export function useActiveFamilyId(): string | null {
  return useCtx().state.activeFamilyId;
}

/** True once the initial secure-store token check (and /me call) has settled —
 * use this to avoid flashing the login screen while that check is in flight. */
export function useSessionReady(): boolean {
  return useCtx().state.sessionReady;
}

/** Phase K — `enabled`: the family has turned on E2EE (server flag). `hasKey`:
 * this device holds the family key (from enabling it, importing it, or
 * joining via an extended invite) — false means locked-message UI should show. */
export function useE2EE(): { enabled: boolean; hasKey: boolean } {
  const { state } = useCtx();
  return { enabled: !!state.family?.e2ee, hasKey: state.hasFamilyKey };
}

/**
 * Phase V — whether this device can currently derive/unwrap `groupId`'s
 * friend-conversation key (mirrors useE2EE().hasKey for family chat) —
 * drives FriendThreadScreen's composer gate ("can't send yet" vs. locked
 * history). Reads the module-level resolvedConvoKeys cache directly (there's
 * no dedicated React state field for it — see upsertConversation/
 * REDECRYPT_CONVO's comments) via useSyncExternalStore-free polling: every
 * mutation that can change it (BOOTSTRAP, GROUP_UPSERT, REDECRYPT_CONVO) is
 * itself a dispatch that changes `state`, so any component subscribed to
 * this store (which every screen using this hook already is) re-renders and
 * re-reads the fresh value — no extra subscription plumbing needed.
 */
export function useConversationKeyReady(groupId: string | undefined): boolean {
  const { state } = useCtx();
  // The `state` reference itself is unused beyond forcing this hook to
  // re-evaluate on every store change — see the comment above.
  void state;
  return !!groupId && !!resolvedConvoKeys[groupId];
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

/** The family's shared notes, most-recently-updated first. */
export function useNotes(): Note[] {
  const { state } = useCtx();
  return useMemo(() => [...state.notes].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [state.notes]);
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

/** Phase U — this user's friends (user-level, family-independent), sorted by display name. */
export function useFriends(): Friend[] {
  const { state } = useCtx();
  return useMemo(() => [...state.friends].sort((a, b) => a.name.localeCompare(b.name)), [state.friends]);
}

/** Phase U — true once this device's identity keypair exists and its public key has been published this session. */
export function useIdentityReady(): boolean {
  return useCtx().state.identityReady;
}
