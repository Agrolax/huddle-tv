import {useCallback, useEffect, useRef, useState} from 'react';
import {
  ConnectionStatus,
  FamilyMessage,
  HouseholdSnapshot,
  HuddleSocket,
  MESSAGE_MAX_LENGTH,
  ServerEnvelope,
  parseJoinParams,
} from '@huddle/shared';
import {Session, loadSession, newClientId, saveSession, serverUrl} from './session';

export interface HuddleState {
  status: ConnectionStatus | 'unpaired';
  error?: {code: string; message: string};
  snapshot: HouseholdSnapshot | null;
  activeProfileIds: string[];
  meId?: string;
  /** Last message this phone sent that the server echoed back. */
  lastSent?: FamilyMessage;
}

/** Joins the household from the QR link (or the saved session) and exposes the phone's actions. */
export function useHuddle() {
  const [session, setSession] = useState<Session | null>(() => resolveSession());
  const [state, setState] = useState<HuddleState>({
    status: session ? 'idle' : 'unpaired',
    snapshot: null,
    activeProfileIds: [],
    meId: session?.meId,
  });
  const socketRef = useRef<HuddleSocket | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const update = useCallback((patch: Partial<Session>) => {
    setSession(s => {
      if (!s) return s;
      const next = {...s, ...patch};
      saveSession(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    const {householdId, clientId} = session;
    const socket = new HuddleSocket({
      url: serverUrl(location.search, location),
      token: session.token,
      hello: () => ({
        householdId,
        client: {
          clientId,
          role: 'phone',
          label: phoneLabel(),
          ...(sessionRef.current?.meId ? {profileId: sessionRef.current.meId} : {}),
        },
        capabilities: {touch: true, text: true, screen: 'phone'},
        topics: ['household', 'messages'],
        ...(sessionRef.current?.pairCode ? {pairCode: sessionRef.current.pairCode} : {}),
      }),
      onToken: token => update({token}),
      onStatus: (status, info) =>
        setState(s => ({...s, status, error: status === 'failed' ? info.error : status === 'open' ? undefined : s.error})),
      onMessage: (msg: ServerEnvelope) => {
        switch (msg.type) {
          case 'welcome': {
            const {snapshot} = msg.payload as {snapshot: HouseholdSnapshot};
            setState(s => ({...s, snapshot, activeProfileIds: snapshot.activeProfileIds}));
            break;
          }
          case 'profile:changed':
            setState(s => ({...s, activeProfileIds: (msg.payload as {profileIds: string[]}).profileIds}));
            break;
          case 'message:new': {
            const m = msg.payload as FamilyMessage;
            if (m.fromClient === 'phone') setState(s => ({...s, lastSent: m}));
            break;
          }
          case 'error':
            setState(s => ({...s, error: msg.payload as {code: string; message: string}}));
            break;
        }
      },
    });
    socketRef.current = socket;
    socket.start();
    return () => socket.stop();
    // Reconnect only when the household or client changes, not on every token save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.householdId, session?.clientId]);

  const switchProfiles = useCallback((profileIds: string[]) => {
    if (!profileIds.length) return false;
    setState(s => ({...s, activeProfileIds: profileIds}));
    return socketRef.current?.send('profile:switch', {profileIds}) ?? false;
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || [...trimmed].length > MESSAGE_MAX_LENGTH) return false;
      const meId = sessionRef.current?.meId;
      return socketRef.current?.send('message:send', {text: trimmed, ...(meId ? {fromProfileId: meId} : {})}) ?? false;
    },
    [],
  );

  const setMe = useCallback(
    (meId: string) => {
      const changed = sessionRef.current?.meId !== meId;
      update({meId});
      if (sessionRef.current) sessionRef.current = {...sessionRef.current, meId};
      setState(s => ({...s, meId}));
      // Say hello again (with the saved token) so the TV labels this phone by its owner.
      if (changed && socketRef.current) {
        socketRef.current.stop();
        socketRef.current.start();
      }
    },
    [update],
  );

  return {...state, switchProfiles, sendMessage, setMe};
}

function resolveSession(): Session | null {
  const fromUrl = parseJoinParams(location.search);
  const saved = loadSession();
  if (fromUrl) {
    // A fresh scan wins. Keep our identity if it's the same household.
    const same = saved?.householdId === fromUrl.householdId;
    const session: Session = {
      householdId: fromUrl.householdId,
      pairCode: fromUrl.pairCode,
      clientId: same ? saved!.clientId : newClientId(),
      ...(same && saved?.token ? {token: saved.token} : {}),
      ...(same && saved?.meId ? {meId: saved.meId} : {}),
    };
    saveSession(session);
    return session;
  }
  return saved;
}

function phoneLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return 'Android phone';
  return 'Phone';
}
