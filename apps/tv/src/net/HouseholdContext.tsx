import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
  CalendarEvent,
  ClientMessage,
  ConnectionStatus,
  FamilyMessage,
  HouseholdSnapshot,
  HuddleSocket,
  PairCode,
  Profile,
  ServerEnvelope,
  SmartDevice,
  Weather,
} from '@huddle/shared';
import {HOUSEHOLD_ID, SERVER_URL} from '../config.generated';
import {PROFILES} from '../data/profiles';
import {getItem, setItem} from './storage';

const TOKEN_KEY = `huddle.tvToken.${HOUSEHOLD_ID}`;
const CLIENT_ID_KEY = 'huddle.tvClientId';

export interface HouseholdState {
  status: ConnectionStatus;
  /** Why the last attempt failed, for the status line. */
  statusDetail?: string;
  serverUrl: string;
  householdName: string;
  profiles: Profile[];
  activeProfileIds: string[];
  /** Phones and displays currently connected. */
  companions: HouseholdSnapshot['clients'];
  pairCode: PairCode | null;
  /** Newest message from a phone; drives the toast and the greeting subline. */
  latestMessage: FamilyMessage | null;
  events: CalendarEvent[];
  devices: SmartDevice[];
  weather: Weather | null;
}

export interface HouseholdActions {
  /** Ask the server for a fresh pair code (no-op while offline; retried on connect). */
  requestPairCode: () => void;
  /** Set who's here locally and tell the server. */
  switchProfiles: (ids: string[]) => void;
  /** Flip or set a simulated device. The tile updates when the server echoes `smart-home:state`. */
  setDevice: (deviceId: string, change: {on?: boolean; level?: number}) => void;
  senderName: (msg: FamilyMessage) => string;
}

const Ctx = createContext<(HouseholdState & HouseholdActions) | null>(null);

export function useHousehold(): HouseholdState & HouseholdActions {
  const value = useContext(Ctx);
  if (!value) throw new Error('useHousehold must be used inside <HouseholdProvider>');
  return value;
}

function randomId(): string {
  return `tv-${Math.random().toString(36).slice(2, 10)}`;
}

interface Props {
  children: React.ReactNode;
  initialProfileIds: string[];
  /** Tests pass a fake; the app uses the real socket. */
  createSocket?: ConstructorParameters<typeof HuddleSocket>[0]['createSocket'];
  serverUrl?: string;
}

export function HouseholdProvider({children, initialProfileIds, createSocket, serverUrl = SERVER_URL}: Props) {
  const [state, setState] = useState<HouseholdState>({
    status: 'idle',
    serverUrl,
    householdName: 'Huddle',
    profiles: PROFILES,
    activeProfileIds: initialProfileIds,
    companions: [],
    pairCode: null,
    latestMessage: null,
    events: [],
    devices: [],
    weather: null,
  });
  const socketRef = useRef<HuddleSocket | null>(null);
  const wantPairCode = useRef(false);
  const activeRef = useRef(initialProfileIds);

  const onMessage = useCallback((msg: ServerEnvelope) => {
    switch (msg.type) {
      case 'welcome': {
        const {snapshot} = msg.payload as Extract<typeof msg.payload, {snapshot: HouseholdSnapshot}>;
        // The TV is the source of who's in the room: push our selection if the server differs.
        const ours = activeRef.current;
        const same = ours.length === snapshot.activeProfileIds.length && ours.every(id => snapshot.activeProfileIds.includes(id));
        if (!same && ours.every(id => snapshot.profiles.some(p => p.id === id))) {
          socketRef.current?.send('profile:switch', {profileIds: ours});
        }
        setState(s => ({
          ...s,
          householdName: snapshot.name,
          profiles: snapshot.profiles.length ? snapshot.profiles : s.profiles,
          companions: snapshot.clients.filter(c => c.role !== 'tv'),
          events: snapshot.events,
          devices: snapshot.devices,
          weather: snapshot.weather ?? s.weather,
        }));
        if (wantPairCode.current) socketRef.current?.send('pair:request', {});
        break;
      }
      case 'pair:code':
        setState(s => ({...s, pairCode: msg.payload as PairCode}));
        break;
      case 'profile:changed': {
        const {profileIds} = msg.payload as {profileIds: string[]};
        activeRef.current = profileIds;
        setState(s => ({...s, activeProfileIds: profileIds}));
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
      case 'message:new':
        setState(s => ({...s, latestMessage: msg.payload as FamilyMessage}));
        break;
      case 'client:joined': {
        const client = msg.payload as HouseholdSnapshot['clients'][number];
        if (client.role === 'tv') break;
        setState(s => ({...s, companions: [...s.companions.filter(c => c.clientId !== client.clientId), client]}));
        break;
      }
      case 'client:left': {
        const {clientId} = msg.payload as {clientId: string};
        setState(s => ({...s, companions: s.companions.filter(c => c.clientId !== clientId)}));
        break;
      }
      case 'error': {
        const {code, message} = msg.payload as {code: string; message: string};
        console.warn(`[huddle] server error ${code}: ${message}`);
        break;
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [token, storedId] = await Promise.all([getItem(TOKEN_KEY), getItem(CLIENT_ID_KEY)]);
      if (cancelled) return;
      const clientId = storedId ?? randomId();
      if (!storedId) setItem(CLIENT_ID_KEY, clientId);
      const socket = new HuddleSocket({
        url: serverUrl,
        token: token ?? undefined,
        createSocket,
        hello: () => ({
          householdId: HOUSEHOLD_ID,
          client: {clientId, role: 'tv', label: 'Living room TV'},
          capabilities: {canvas: true, audio: true, screen: 'tv'},
          topics: [],
        }),
        onMessage,
        onToken: t => setItem(TOKEN_KEY, t),
        onStatus: (status, info) =>
          setState(s => ({
            ...s,
            status,
            statusDetail: info.error?.message,
            // A code from before a reconnect may belong to a restarted server.
            pairCode: status === 'open' ? s.pairCode : null,
          })),
      });
      socketRef.current = socket;
      socket.start();
    })();
    return () => {
      cancelled = true;
      socketRef.current?.stop();
      socketRef.current = null;
    };
  }, [serverUrl, createSocket, onMessage]);

  const requestPairCode = useCallback(() => {
    wantPairCode.current = true;
    socketRef.current?.send('pair:request', {});
  }, []);

  const switchProfiles = useCallback((ids: string[]) => {
    activeRef.current = ids;
    setState(s => ({...s, activeProfileIds: ids}));
    socketRef.current?.send<Extract<ClientMessage, {type: 'profile:switch'}>>('profile:switch', {profileIds: ids});
  }, []);

  const setDevice = useCallback((deviceId: string, change: {on?: boolean; level?: number}) => {
    socketRef.current?.send<Extract<ClientMessage, {type: 'smart-home:set'}>>('smart-home:set', {deviceId, ...change});
  }, []);

  const senderName = useCallback(
    (msg: FamilyMessage) => state.profiles.find(p => p.id === msg.fromProfileId)?.name ?? 'A phone',
    [state.profiles],
  );

  const value = useMemo(
    () => ({...state, requestPairCode, switchProfiles, setDevice, senderName}),
    [state, requestPairCode, switchProfiles, setDevice, senderName],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
