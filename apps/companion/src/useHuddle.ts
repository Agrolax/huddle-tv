import {useCallback, useEffect, useRef, useState} from 'react';
import {
  CalendarEvent,
  ConnectionStatus,
  FamilyMessage,
  HouseholdSnapshot,
  HuddleSocket,
  MESSAGE_MAX_LENGTH,
  ServerEnvelope,
  SmartDevice,
  TonightMood,
  TonightPicks,
  Weather,
  CHAT_MAX_LENGTH,
  parseJoinParams,
} from '@huddle/shared';
import {Session, loadSession, newClientId, saveSession, serverUrl} from './session';

export interface HuddleState {
  status: ConnectionStatus | 'unpaired';
  error?: {code: string; message: string};
  snapshot: HouseholdSnapshot | null;
  activeProfileIds: string[];
  events: CalendarEvent[];
  devices: SmartDevice[];
  weather: Weather | null;
  meId?: string;
  /** Last message this phone sent that the server echoed back. */
  lastSent?: FamilyMessage;
  tonight: TonightPicks | null;
  tonightLoading: boolean;
  chat: ChatState;
}

export interface ChatLine {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatState {
  conversationId: string;
  lines: ChatLine[];
  /** An answer is streaming in. */
  streaming: boolean;
}

function newChat(): ChatState {
  return {conversationId: `c${Math.random().toString(36).slice(2, 10)}`, lines: [], streaming: false};
}

/** Joins the household from the QR link (or the saved session) and exposes the phone's actions. */
export function useHuddle() {
  const [session, setSession] = useState<Session | null>(() => resolveSession());
  const [state, setState] = useState<HuddleState>({
    status: session ? 'idle' : 'unpaired',
    snapshot: null,
    activeProfileIds: [],
    events: [],
    devices: [],
    weather: null,
    meId: session?.meId,
    tonight: null,
    tonightLoading: false,
    chat: newChat(),
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
        topics: ['household', 'messages', 'calendar', 'smart-home', 'weather', 'tonight', 'chat'],
        ...(sessionRef.current?.pairCode ? {pairCode: sessionRef.current.pairCode} : {}),
      }),
      onToken: token => update({token}),
      onStatus: (status, info) =>
        setState(s => ({
          ...s,
          status,
          error: status === 'failed' ? info.error : status === 'open' ? undefined : s.error,
          // The server drops an answer when the socket goes; don't leave the spinner up.
          ...(status === 'open' ? {} : {tonightLoading: false, chat: {...s.chat, streaming: false}}),
        })),
      onMessage: (msg: ServerEnvelope) => {
        switch (msg.type) {
          case 'welcome': {
            const {snapshot} = msg.payload as {snapshot: HouseholdSnapshot};
            setState(s => ({
              ...s,
              snapshot,
              activeProfileIds: snapshot.activeProfileIds,
              events: snapshot.events,
              devices: snapshot.devices,
              weather: snapshot.weather ?? s.weather,
              tonight: snapshot.tonight ?? s.tonight,
            }));
            break;
          }
          case 'calendar:updated':
            setState(s => ({...s, events: (msg.payload as {events: CalendarEvent[]}).events}));
            break;
          case 'smart-home:state':
            setState(s => ({...s, devices: (msg.payload as {devices: SmartDevice[]}).devices}));
            break;
          case 'weather:updated':
            setState(s => ({...s, weather: msg.payload as Weather}));
            break;
          case 'profile:changed':
            setState(s => ({...s, activeProfileIds: (msg.payload as {profileIds: string[]}).profileIds}));
            break;
          case 'message:new': {
            const m = msg.payload as FamilyMessage;
            if (m.fromClient === 'phone') setState(s => ({...s, lastSent: m}));
            break;
          }
          case 'tonight:picks':
            setState(s => ({...s, tonight: msg.payload as TonightPicks, tonightLoading: false}));
            break;
          case 'chat:reply': {
            const {conversationId, text, done} = msg.payload as {conversationId: string; text: string; done: boolean};
            setState(s => {
              if (s.chat.conversationId !== conversationId) return s;
              const lines = [...s.chat.lines];
              const last = lines[lines.length - 1];
              if (last?.role === 'assistant') lines[lines.length - 1] = {...last, text: last.text + text};
              else if (text) lines.push({role: 'assistant', text});
              return {...s, chat: {...s.chat, lines, streaming: !done}};
            });
            break;
          }
          case 'error': {
            const error = msg.payload as {code: string; message: string};
            setState(s => ({
              ...s,
              error,
              ...(error.code !== 'busy' && /tonight/i.test(error.message) ? {tonightLoading: false} : {}),
              ...(error.code !== 'busy' && /chat/i.test(error.message) ? {chat: {...s.chat, streaming: false}} : {}),
            }));
            break;
          }
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

  const addEvent = useCallback((event: {title: string; start: string; profileIds: string[]}) => {
    const title = event.title.trim();
    if (!title || Number.isNaN(Date.parse(event.start))) return false;
    return socketRef.current?.send('calendar:add', {...event, title}) ?? false;
  }, []);

  const removeEvent = useCallback((eventId: string) => socketRef.current?.send('calendar:remove', {eventId}) ?? false, []);

  const setDevice = useCallback(
    (deviceId: string, change: {on?: boolean; level?: number}) => socketRef.current?.send('smart-home:set', {deviceId, ...change}) ?? false,
    [],
  );

  /** Demo doorbell: the TV shows "Someone is at the door". */
  const ringDoor = useCallback(() => socketRef.current?.send('door:simulate', {kind: 'ring'}) ?? false, []);

  const requestTonight = useCallback((mood?: TonightMood) => {
    const sent = socketRef.current?.send('tonight:request', mood ? {mood} : {}) ?? false;
    if (sent) setState(s => ({...s, tonightLoading: true}));
    return sent;
  }, []);

  const chatRef = useRef(state.chat);
  chatRef.current = state.chat;

  const ask = useCallback((text: string) => {
    const trimmed = text.trim();
    const chat = chatRef.current;
    if (!trimmed || [...trimmed].length > CHAT_MAX_LENGTH || chat.streaming) return false;
    const sent = socketRef.current?.send('chat:ask', {text: trimmed, conversationId: chat.conversationId}) ?? false;
    if (!sent) return false;
    const next: ChatState = {...chat, streaming: true, lines: [...chat.lines, {role: 'user', text: trimmed}]};
    chatRef.current = next;
    setState(s => ({...s, chat: next}));
    return true;
  }, []);

  const resetChat = useCallback(() => setState(s => (s.chat.streaming ? s : {...s, chat: newChat()})), []);

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

  return {...state, switchProfiles, sendMessage, addEvent, removeEvent, setDevice, ringDoor, setMe, requestTonight, ask, resetChat};
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
