// Realtime bridge: opens a WebSocket to the API's hub (server/src/ws.js) and
// dispatches incoming domain events into the store. Must be called from a
// descendant of <AppStoreProvider> (e.g. App.tsx's Gate) — it uses the raw
// store dispatch via useStoreDispatch().
import { useEffect, useRef } from 'react';
import { AppState as RNAppState, AppStateStatus } from 'react-native';
import { getBootstrap, getSync, getWsUrl } from '../api/client';
import {
  applyFriendGroupsSync,
  applyIncomingFriendGroupKey,
  applyIncomingKeyRoll,
  applyIncomingKeyRolls,
  fromServerMessage,
  fromServerNote,
  upsertConversation,
  useActiveFamilyId,
  useGroups,
  useLastSync,
  useSession,
  useStoreDispatch,
} from './AppStore';

const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

export function useRealtime(): void {
  const session = useSession();
  const lastSync = useLastSync();
  const dispatch = useStoreDispatch();

  const lastSyncRef = useRef(lastSync);
  lastSyncRef.current = lastSync;

  // Phase S — the WS hub is user-scoped: a member of several families gets
  // EVERY family's broadcasts down the one socket (see server/src/ws.js),
  // but the store only ever holds the ACTIVE family's slices (replaced
  // wholesale on bootstrap/switchFamily). These refs let the onmessage
  // closure (set up once per connect(), long-lived across renders) always
  // see the CURRENT active family / known group ids without reconnecting.
  const activeFamilyId = useActiveFamilyId();
  const activeFamilyIdRef = useRef(activeFamilyId);
  activeFamilyIdRef.current = activeFamilyId;

  const groups = useGroups();
  const groupIdsRef = useRef<Set<string>>(new Set());
  groupIdsRef.current = new Set(Object.keys(groups));

  useEffect(() => {
    if (!session) return;

    let stopped = false;
    let socket: WebSocket | null = null;
    let backoff = MIN_BACKOFF_MS;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const sync = async () => {
      try {
        if (lastSyncRef.current) {
          const data = await getSync(session.token, lastSyncRef.current);
          // Apply any key rolls we missed while offline BEFORE mapping the new
          // messages, so post-rotation messages decrypt on first pass instead
          // of flashing locked and waiting for the REDECRYPT that these rolls
          // would otherwise trigger.
          if (data.keyRolls.length) applyIncomingKeyRolls(data.keyRolls, dispatch);
          if (data.messages.length) {
            dispatch({ type: 'MERGE_MESSAGES', messages: data.messages.map(fromServerMessage) });
          }
          for (const r of data.reads) {
            dispatch({ type: 'MERGE_READ', groupId: r.groupId, userId: r.userId, ts: Date.parse(r.lastReadTs) });
          }
          // Grocery/tasks/events/albums are resent in full on every sync (see
          // server's getSyncSince comment) — a plain replace is simplest and
          // correct. Photos are never synced; screens refetch per album.
          dispatch({ type: 'GROCERY_SET', grocery: data.grocery });
          dispatch({ type: 'TASK_SET', tasks: data.tasks });
          dispatch({ type: 'EVENT_SET', events: data.events });
          // Phase P — notes go through fromServerNote (not a bare passthrough
          // like grocery/tasks/events) since the ciphertext needs decrypting
          // against whatever key ring we're currently holding.
          dispatch({ type: 'NOTE_SET', notes: data.notes.map(fromServerNote) });
          dispatch({ type: 'ALBUM_SET', albums: data.albums });
          dispatch({ type: 'FIN_SET', expenses: data.expenses, transfers: data.transfers, budget: data.budget });
          dispatch({ type: 'CATEGORY_SET', categories: data.categories });
          // Phase U — full resend on every sync, same as grocery/tasks/events/
          // albums above (user-level, not family-scoped, but the same
          // "simplest-correct" full-replace applies).
          dispatch({ type: 'FRIEND_SET', friends: data.friends });
          // Phase V — same full-resend pattern as `friends` above (also
          // family-independent). `data.messages`/`data.reads` above already
          // cover every group the user belongs to regardless of family (see
          // chat.js's getSyncSince), so this only needs to (re)apply group
          // metadata + wrapped keys, not messages.
          applyFriendGroupsSync(data.friendGroups, data.friendGroupKeys, dispatch);
          dispatch({ type: 'SET_LAST_SYNC', serverTime: data.serverTime });
        } else {
          const data = await getBootstrap(session.token);
          dispatch({ type: 'BOOTSTRAP', payload: data });
        }
      } catch (err) {
        console.warn('[realtime] sync failed', err);
      }
    };

    const connect = () => {
      if (stopped) return;
      const ws = new WebSocket(getWsUrl(session.token));
      socket = ws;

      ws.onopen = () => {
        backoff = MIN_BACKOFF_MS;
        sync();
      };

      ws.onmessage = (evt) => {
        let data: any;
        try {
          data = JSON.parse(String(evt.data));
        } catch {
          return; // malformed frame — ignore
        }

        // Phase S — the WS hub delivers events for EVERY family this user
        // belongs to (it's a per-user socket, not per-family — see
        // server/src/ws.js), but the store's flat slices only ever hold the
        // ACTIVE family's data. `isActiveFamily` drops any upsert whose
        // familyId isn't the one currently loaded, so a background family's
        // traffic never leaks into the slices the active-family screens
        // read. Remove/clear actions are deliberately NOT filtered here —
        // they're id-based array filters that are a safe no-op if the id
        // belongs to a family we're not currently holding data for.
        const isActiveFamily = (familyId: string | null | undefined) => !!familyId && familyId === activeFamilyIdRef.current;

        switch (data?.type) {
          case 'message':
            // No familyId on the wire — filter by whether this message's
            // group is one of the active family's KNOWN groups (state.groups
            // is replaced wholesale on bootstrap/switchFamily, so a group
            // from a background family is simply absent here).
            if (data.message && groupIdsRef.current.has(data.message.groupId)) {
              dispatch({ type: 'MERGE_MESSAGES', messages: [fromServerMessage(data.message)] });
            }
            break;
          case 'read':
            if (groupIdsRef.current.has(data.groupId)) {
              dispatch({ type: 'MERGE_READ', groupId: data.groupId, userId: data.userId, ts: Date.parse(data.lastReadTs) });
            }
            break;
          case 'group':
            // Phase V — a friends-kind group is family-independent (no
            // familyId to gate on — see server/db/014_friend_convos.sql), so
            // it's ALWAYS applied regardless of the active family; a
            // family-kind group keeps the existing active-family filter.
            if (data.group?.kind === 'friends') {
              upsertConversation(data.group, dispatch);
            } else if (isActiveFamily(data.group?.familyId)) {
              upsertConversation(data.group, dispatch);
            }
            break;
          // Phase V — a member (possibly this device, on being added to a
          // friend group) just received their wrapped copy of that group's
          // key. Family-independent, same as `friend` below.
          case 'friendGroupKey':
            if (data.groupId && data.wrapped && data.wrappedBy) {
              applyIncomingFriendGroupKey(
                { groupId: data.groupId, wrapped: data.wrapped, wrappedBy: data.wrappedBy, wrappedByPublicKey: data.wrappedByPublicKey ?? null },
                dispatch,
              );
            }
            break;
          case 'family':
            // 'upsert' has no current server-side sender (Phase K's e2ee-flip
            // broadcast was removed in Phase M once encryption became
            // mandatory-at-creation) — kept as a forward-compatible patch path
            // for future family-attribute broadcasts (e.g. a rename). Merges
            // onto whatever family state we already have rather than
            // dropping `members` to [], since this event doesn't carry it.
            // FAMILY_PATCH itself is safe to dispatch for ANY family we're
            // tracking in `families` (not just the active one) — it patches
            // the matching `families` entry either way and only touches the
            // active `family` slice if the id matches (see the reducer).
            if (data.action === 'upsert' && data.family) {
              dispatch({ type: 'FAMILY_PATCH', patch: { id: data.family.id, name: data.family.name, inviteCode: data.family.inviteCode, e2ee: data.family.e2ee } });
            }
            // Phase L — broadcast when someone joins the family (see
            // family.js's joinFamily) so every existing member's roster
            // (chat-list nameOf(), Finance split pickers, group-settings
            // "add member" chips, and — the case that motivated this — who
            // can now read an E2EE chat) updates live instead of only on
            // the joiner's own device or after a re-login.
            else if (data.action === 'members' && data.familyId && data.members) {
              dispatch({ type: 'FAMILY_PATCH', patch: { id: data.familyId, members: data.members } });
            }
            // Phase N — a member rotated the family key. `roll` carries the
            // wrapped-key envelope; applyIncomingKeyRoll fixpoint-replays it
            // into our in-memory ring (module-level in AppStore.tsx) and
            // dispatches REDECRYPT itself if that recovers a new key — same
            // "plain function, bare dispatch" shape as fromServerMessage.
            // applyIncomingKeyRolls itself already no-ops for a roll whose
            // familyId doesn't match the ring's familyId (== the active
            // family — see the key-load effect), so no extra filter is
            // needed here for a background family's rotation.
            else if (data.action === 'keyroll' && data.roll) {
              applyIncomingKeyRoll(data.roll, dispatch);
            }
            break;
          case 'grocery':
            if (data.action === 'upsert') {
              if (isActiveFamily(data.item?.familyId)) dispatch({ type: 'GROCERY_UPSERT', item: data.item });
            } else if (data.action === 'remove') dispatch({ type: 'GROCERY_REMOVE', id: data.ids?.[0] });
            else if (data.action === 'clear-checked') dispatch({ type: 'GROCERY_CLEAR_CHECKED' });
            break;
          case 'task':
            if (data.action === 'upsert') {
              if (isActiveFamily(data.task?.familyId)) dispatch({ type: 'TASK_UPSERT', task: data.task });
            } else if (data.action === 'remove') dispatch({ type: 'TASK_REMOVE', id: data.ids?.[0] });
            break;
          case 'event':
            if (data.action === 'upsert') {
              if (isActiveFamily(data.event?.familyId)) dispatch({ type: 'EVENT_UPSERT', event: data.event });
            } else if (data.action === 'remove') dispatch({ type: 'EVENT_REMOVE', id: data.id });
            break;
          case 'note':
            // Phase P — 'upsert' carries the raw ServerNote (ciphertext); map
            // it through fromServerNote same as bootstrap/sync so it decrypts
            // (or renders locked) against whatever key ring we hold right now.
            if (data.action === 'upsert') {
              if (isActiveFamily(data.note?.familyId)) dispatch({ type: 'NOTE_UPSERT', note: fromServerNote(data.note) });
            } else if (data.action === 'remove') dispatch({ type: 'NOTE_REMOVE', id: data.ids?.[0] });
            break;
          case 'album':
            if (data.action === 'upsert') {
              if (isActiveFamily(data.album?.familyId)) dispatch({ type: 'ALBUM_UPSERT', album: data.album });
            } else if (data.action === 'remove') dispatch({ type: 'ALBUM_REMOVE', id: data.id });
            break;
          case 'photo':
            if (data.action === 'upsert') {
              if (isActiveFamily(data.photo?.familyId)) dispatch({ type: 'PHOTO_UPSERT', photo: data.photo });
            } else if (data.action === 'remove') dispatch({ type: 'PHOTO_REMOVE', id: data.id, albumId: data.albumId });
            break;
          case 'expense':
            if (data.action === 'upsert') {
              if (isActiveFamily(data.expense?.familyId)) dispatch({ type: 'EXPENSE_UPSERT', expense: data.expense });
            } else if (data.action === 'remove') dispatch({ type: 'EXPENSE_REMOVE', id: data.id });
            break;
          case 'transfer':
            if (data.action === 'upsert' && isActiveFamily(data.transfer?.familyId)) {
              dispatch({ type: 'TRANSFER_UPSERT', transfer: data.transfer });
            }
            break;
          case 'budget':
            if (data.action === 'upsert' && isActiveFamily(data.budget?.familyId)) {
              dispatch({ type: 'BUDGET_UPSERT', budget: data.budget });
            }
            break;
          case 'category':
            if (data.action === 'upsert') {
              if (isActiveFamily(data.category?.familyId)) dispatch({ type: 'CATEGORY_UPSERT', category: data.category });
            } else if (data.action === 'remove') dispatch({ type: 'CATEGORY_REMOVE', id: data.id });
            break;
          // Phase U — friends are user-level and family-independent (no
          // familyId to filter on, unlike every other case above), so this
          // upserts unconditionally: connectByQr broadcasts to exactly the
          // two users involved (see server/src/friends.js), so any `friend`
          // event this socket receives is always meant for the signed-in user.
          case 'friend':
            if (data.action === 'upsert' && data.friend) dispatch({ type: 'FRIEND_UPSERT', friend: data.friend });
            break;
          default:
            break; // 'hello' and any future event types we don't handle yet
        }
      };

      ws.onclose = () => {
        if (stopped) return;
        reconnectTimer = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    const onAppStateChange = (status: AppStateStatus) => {
      if (status === 'active') sync();
    };
    const subscription = RNAppState.addEventListener('change', onAppStateChange);

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      subscription.remove();
    };
  }, [session?.token, dispatch]);
}
