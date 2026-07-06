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
