// Realtime bridge: opens a WebSocket to the API's hub (server/src/ws.js) and
// dispatches incoming domain events into the store. Must be called from a
// descendant of <AppStoreProvider> (e.g. App.tsx's Gate) — it uses the raw
// store dispatch via useStoreDispatch().
import { useEffect, useRef } from 'react';
import { AppState as RNAppState, AppStateStatus } from 'react-native';
import { getBootstrap, getSync, getWsUrl } from '../api/client';
import { fromServerMessage, useLastSync, useSession, useStoreDispatch } from './AppStore';

const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

export function useRealtime(): void {
  const session = useSession();
  const lastSync = useLastSync();
  const dispatch = useStoreDispatch();

  const lastSyncRef = useRef(lastSync);
  lastSyncRef.current = lastSync;

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
          dispatch({ type: 'ALBUM_SET', albums: data.albums });
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
        switch (data?.type) {
          case 'message':
            dispatch({ type: 'MERGE_MESSAGES', messages: [fromServerMessage(data.message)] });
            break;
          case 'read':
            dispatch({ type: 'MERGE_READ', groupId: data.groupId, userId: data.userId, ts: Date.parse(data.lastReadTs) });
            break;
          case 'group':
            dispatch({ type: 'GROUP_UPSERT', group: data.group });
            break;
          case 'grocery':
            if (data.action === 'upsert') dispatch({ type: 'GROCERY_UPSERT', item: data.item });
            else if (data.action === 'remove') dispatch({ type: 'GROCERY_REMOVE', id: data.ids?.[0] });
            else if (data.action === 'clear-checked') dispatch({ type: 'GROCERY_CLEAR_CHECKED' });
            break;
          case 'task':
            if (data.action === 'upsert') dispatch({ type: 'TASK_UPSERT', task: data.task });
            else if (data.action === 'remove') dispatch({ type: 'TASK_REMOVE', id: data.ids?.[0] });
            break;
          case 'event':
            if (data.action === 'upsert') dispatch({ type: 'EVENT_UPSERT', event: data.event });
            else if (data.action === 'remove') dispatch({ type: 'EVENT_REMOVE', id: data.id });
            break;
          case 'album':
            if (data.action === 'upsert') dispatch({ type: 'ALBUM_UPSERT', album: data.album });
            else if (data.action === 'remove') dispatch({ type: 'ALBUM_REMOVE', id: data.id });
            break;
          case 'photo':
            if (data.action === 'upsert') dispatch({ type: 'PHOTO_UPSERT', photo: data.photo });
            else if (data.action === 'remove') dispatch({ type: 'PHOTO_REMOVE', id: data.id, albumId: data.albumId });
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
