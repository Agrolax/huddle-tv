import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
  CalendarEvent,
  ClientMessage,
  ConnectionStatus,
  DoorEvent,
  EMPTY_CANVAS,
  FamilyMessage,
  GameState,
  IDLE_GAME,
  IDLE_VOTE,
  League,
  QuizSource,
  HouseholdSnapshot,
  HuddleSocket,
  PairCode,
  Profile,
  ServerEnvelope,
  SketchCanvas,
  SmartDevice,
  Stroke,
  TonightMood,
  TonightPicks,
  TonightVote,
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
  /** Newest doorbell ring or motion; drives the door alert. */
  latestDoor: DoorEvent | null;
  events: CalendarEvent[];
  devices: SmartDevice[];
  weather: Weather | null;
  /** Latest Tonight picks, from this TV or a phone. */
  tonight: TonightPicks | null;
  /** A `tonight:request` is out and no picks have come back yet. */
  tonightLoading: boolean;
  /** Game night: the current game, as the server runs it. */
  game: GameState;
  /** Family league totals across games. */
  league: League;
  /** Secret veto on the Tonight picks. */
  vote: TonightVote;
  /** Sketch the pick: the drawing for the current round. */
  canvas: SketchCanvas;
  /** Sketch the pick: guesses this round, newest last. */
  guesses: SketchGuess[];
}

export interface SketchGuess {
  profileId: string;
  /** Missing for a right guess, so the TV doesn't show the answer. */
  text?: string;
  correct: boolean;
}

export interface HouseholdActions {
  /** Ask the server for a fresh pair code (no-op while offline; retried on connect). */
  requestPairCode: () => void;
  /** Set who's here locally and tell the server. */
  switchProfiles: (ids: string[]) => void;
  /** Flip or set a simulated device. The tile updates when the server echoes `smart-home:state`. */
  setDevice: (deviceId: string, change: {on?: boolean; level?: number}) => void;
  /** Ask for picks for whoever is here. Returns false while offline. */
  requestTonight: (mood?: TonightMood) => boolean;
  /** Start a quiz. Returns false while offline. */
  startQuiz: (source: QuizSource, title?: string) => boolean;
  /** Start Sketch the pick (needs two phones). Returns false while offline. */
  startSketch: () => boolean;
  /** Secret veto on the current picks. */
  startVote: () => boolean;
  /** Stop waiting for phones and show the result. */
  voteNext: () => void;
  endVote: () => void;
  /** Skip to the reveal or the next question. */
  nextGameStep: () => void;
  endGame: () => void;
  senderName: (msg: FamilyMessage) => string;
}

/** Give up waiting for picks after this long (the server answers or falls back well before). */
const TONIGHT_WAIT_MS = 20_000;

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
    latestDoor: null,
    events: [],
    devices: [],
    weather: null,
    tonight: null,
    tonightLoading: false,
    game: IDLE_GAME,
    league: {},
    vote: IDLE_VOTE,
    canvas: EMPTY_CANVAS,
    guesses: [],
  });
  const socketRef = useRef<HuddleSocket | null>(null);
  const wantPairCode = useRef(false);
  const activeRef = useRef(initialProfileIds);
  const tonightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          tonight: snapshot.tonight ?? s.tonight,
          game: snapshot.game ?? IDLE_GAME,
          league: snapshot.league ?? {},
          vote: snapshot.vote ?? IDLE_VOTE,
          canvas: snapshot.sketch ?? EMPTY_CANVAS,
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
      case 'profiles:updated':
        setState(s => ({...s, profiles: (msg.payload as {profiles: Profile[]}).profiles}));
        break;
      case 'calendar:updated':
        setState(s => ({...s, events: (msg.payload as {events: CalendarEvent[]}).events}));
        break;
      case 'smart-home:state':
        setState(s => ({...s, devices: (msg.payload as {devices: SmartDevice[]}).devices}));
        break;
      case 'weather:updated':
        setState(s => ({...s, weather: msg.payload as Weather}));
        break;
      case 'tonight:picks':
        if (tonightTimer.current) clearTimeout(tonightTimer.current);
        setState(s => ({...s, tonight: msg.payload as TonightPicks, tonightLoading: false}));
        break;
      case 'message:new':
        setState(s => ({...s, latestMessage: msg.payload as FamilyMessage}));
        break;
      case 'game:state': {
        const game = msg.payload as GameState;
        setState(s => {
          // A new round (or game) starts with a blank canvas and no guesses.
          const newRound = game.gameId !== s.canvas.gameId || game.round !== s.canvas.round;
          return newRound && game.phase === 'question'
            ? {...s, game, canvas: {gameId: game.gameId, round: game.round, strokes: []}, guesses: []}
            : {...s, game};
        });
        break;
      }
      case 'tonight:vote-state':
        setState(s => ({...s, vote: msg.payload as TonightVote}));
        break;
      case 'sketch:stroke': {
        const {gameId, round, stroke} = msg.payload as {gameId: string; round: number; stroke: Stroke};
        setState(s => {
          if (s.canvas.gameId !== gameId || s.canvas.round !== round) return s;
          const i = s.canvas.strokes.findIndex(x => x.id === stroke.id);
          const strokes =
            i < 0
              ? [...s.canvas.strokes, stroke]
              : s.canvas.strokes.map((x, k) => (k === i ? {...x, points: [...x.points, ...stroke.points]} : x));
          return {...s, canvas: {...s.canvas, strokes}};
        });
        break;
      }
      case 'sketch:clear':
        setState(s => ({...s, canvas: {...s.canvas, strokes: []}}));
        break;
      case 'sketch:guess': {
        const {round, gameId, ...guess} = msg.payload as SketchGuess & {gameId: string; round: number};
        setState(s => (s.game.gameId === gameId && s.game.round === round ? {...s, guesses: [...s.guesses, guess].slice(-8)} : s));
        break;
      }
      case 'league:updated':
        setState(s => ({...s, league: msg.payload as League}));
        break;
      case 'door:event':
        setState(s => ({...s, latestDoor: msg.payload as DoorEvent}));
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
        // "busy" means picks are already coming; anything else about Tonight won't be answered.
        if (code !== 'busy' && /tonight/i.test(message)) setState(s => ({...s, tonightLoading: false}));
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
            tonightLoading: status === 'open' ? s.tonightLoading : false,
          })),
      });
      socketRef.current = socket;
      socket.start();
    })();
    return () => {
      cancelled = true;
      if (tonightTimer.current) clearTimeout(tonightTimer.current);
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

  const requestTonight = useCallback((mood?: TonightMood) => {
    // Loading goes on before the send, so picks that come back right away turn it off again.
    setState(s => ({...s, tonightLoading: true}));
    const sent =
      socketRef.current?.send<Extract<ClientMessage, {type: 'tonight:request'}>>('tonight:request', mood ? {mood} : {}) ?? false;
    if (tonightTimer.current) clearTimeout(tonightTimer.current);
    if (!sent) {
      setState(s => ({...s, tonightLoading: false}));
      return false;
    }
    tonightTimer.current = setTimeout(() => setState(s => ({...s, tonightLoading: false})), TONIGHT_WAIT_MS);
    return true;
  }, []);

  const startQuiz = useCallback(
    (source: QuizSource, title?: string) =>
      socketRef.current?.send<Extract<ClientMessage, {type: 'game:start'}>>('game:start', {kind: 'quiz', source, ...(title ? {title} : {})}) ??
      false,
    [],
  );

  const startSketch = useCallback(
    () => socketRef.current?.send<Extract<ClientMessage, {type: 'game:start'}>>('game:start', {kind: 'sketch'}) ?? false,
    [],
  );

  const startVote = useCallback(
    () => socketRef.current?.send<Extract<ClientMessage, {type: 'tonight:vote-start'}>>('tonight:vote-start', {}) ?? false,
    [],
  );
  const voteId = state.vote.voteId;
  const voteNext = useCallback(() => {
    if (voteId) socketRef.current?.send<Extract<ClientMessage, {type: 'tonight:vote-next'}>>('tonight:vote-next', {voteId});
  }, [voteId]);
  const endVote = useCallback(() => {
    if (voteId) socketRef.current?.send<Extract<ClientMessage, {type: 'tonight:vote-end'}>>('tonight:vote-end', {voteId});
  }, [voteId]);

  const gameId = state.game.gameId;
  const nextGameStep = useCallback(() => {
    if (gameId) socketRef.current?.send<Extract<ClientMessage, {type: 'game:next'}>>('game:next', {gameId});
  }, [gameId]);
  const endGame = useCallback(() => {
    if (gameId) socketRef.current?.send<Extract<ClientMessage, {type: 'game:end'}>>('game:end', {gameId});
  }, [gameId]);

  const senderName = useCallback(
    (msg: FamilyMessage) => state.profiles.find(p => p.id === msg.fromProfileId)?.name ?? 'A phone',
    [state.profiles],
  );

  const value = useMemo(
    () => ({
      ...state,
      requestPairCode,
      switchProfiles,
      setDevice,
      requestTonight,
      startQuiz,
      startSketch,
      startVote,
      voteNext,
      endVote,
      nextGameStep,
      endGame,
      senderName,
    }),
    [state, requestPairCode, switchProfiles, setDevice, requestTonight, startQuiz, startSketch, startVote, voteNext, endVote, nextGameStep, endGame, senderName],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
