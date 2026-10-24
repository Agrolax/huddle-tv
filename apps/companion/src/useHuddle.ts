import {useCallback, useEffect, useRef, useState} from 'react';
import {
  CalendarEvent,
  ConnectionStatus,
  FamilyMessage,
  GameState,
  HouseholdSnapshot,
  IDLE_GAME,
  Profile,
  IDLE_VOTE,
  League,
  QuizSource,
  HuddleSocket,
  MESSAGE_MAX_LENGTH,
  ServerEnvelope,
  SmartDevice,
  TonightMood,
  TonightPicks,
  TonightVote,
  Stroke,
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
  game: GameState;
  league: League;
  /** This phone's answer to the current question, until the next one. */
  myAnswer?: {gameId: string; round: number; choice: number};
  vote: TonightVote;
  /** This phone voted in the current vote phase (`<voteId>:<phase>`). */
  myVote?: string;
  /** Sketch the pick: what to draw, when this phone draws. */
  prompt?: {gameId: string; round: number; prompt: string};
  /** Sketch the pick: this phone's guesses this round; the server says which was right. */
  myGuesses: Array<{text: string; correct?: boolean}>;
  /** Sketch the pick: someone else's right guesses this round. */
  othersGot: string[];
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
    game: IDLE_GAME,
    league: {},
    vote: IDLE_VOTE,
    myGuesses: [],
    othersGot: [],
  });
  const socketRef = useRef<HuddleSocket | null>(null);
  /** The next saved profile is this phone's person (someone added themselves). */
  const claimRef = useRef(false);
  const setMeRef = useRef<(id: string) => void>(() => {});
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
        topics: ['household', 'messages', 'calendar', 'smart-home', 'weather', 'tonight', 'chat', 'game', 'sketch'],
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
              game: snapshot.game ?? IDLE_GAME,
              league: snapshot.league ?? {},
              vote: snapshot.vote ?? IDLE_VOTE,
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
          case 'profiles:updated': {
            const {profiles, savedId} = msg.payload as {profiles: Profile[]; savedId: string};
            setState(s => (s.snapshot ? {...s, snapshot: {...s.snapshot, profiles}} : s));
            if (claimRef.current) {
              claimRef.current = false;
              setMeRef.current(savedId);
            }
            break;
          }
          case 'message:new': {
            const m = msg.payload as FamilyMessage;
            if (m.fromClient === 'phone') setState(s => ({...s, lastSent: m}));
            break;
          }
          case 'game:state': {
            const game = msg.payload as GameState;
            setState(s => {
              const newRound = game.gameId !== s.game.gameId || game.round !== s.game.round;
              return newRound ? {...s, game, myGuesses: [], othersGot: []} : {...s, game};
            });
            break;
          }
          case 'tonight:vote-state':
            setState(s => ({...s, vote: msg.payload as TonightVote}));
            break;
          case 'sketch:prompt':
            setState(s => ({...s, prompt: msg.payload as HuddleState['prompt']}));
            break;
          case 'sketch:guess': {
            const g = msg.payload as {gameId: string; round: number; profileId: string; text?: string; correct: boolean};
            setState(s => {
              if (g.gameId !== s.game.gameId || g.round !== s.game.round) return s;
              if (g.profileId === sessionRef.current?.meId) {
                // Mark the oldest unconfirmed guess of ours with the server's verdict.
                const i = s.myGuesses.findIndex(x => x.correct === undefined);
                if (i < 0) return s;
                const myGuesses = s.myGuesses.map((x, k) => (k === i ? {...x, correct: g.correct} : x));
                return {...s, myGuesses};
              }
              return g.correct ? {...s, othersGot: [...s.othersGot, g.profileId]} : s;
            });
            break;
          }
          case 'league:updated':
            setState(s => ({...s, league: msg.payload as League}));
            break;
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

  const startQuiz = useCallback(
    (source: QuizSource, title?: string) =>
      socketRef.current?.send('game:start', {kind: 'quiz', source, ...(title ? {title} : {})}) ?? false,
    [],
  );

  const answerQuiz = useCallback((gameId: string, round: number, choice: number) => {
    const sent = socketRef.current?.send('game:answer', {gameId, round, choice}) ?? false;
    if (sent) setState(s => ({...s, myAnswer: {gameId, round, choice}}));
    return sent;
  }, []);

  const nextGameStep = useCallback((gameId: string) => socketRef.current?.send('game:next', {gameId}) ?? false, []);
  const endGame = useCallback((gameId: string) => socketRef.current?.send('game:end', {gameId}) ?? false, []);

  const startSketch = useCallback(() => socketRef.current?.send('game:start', {kind: 'sketch'}) ?? false, []);

  const sendStroke = useCallback(
    (gameId: string, round: number, stroke: Stroke) => socketRef.current?.send('sketch:stroke', {gameId, round, stroke}) ?? false,
    [],
  );
  const clearSketch = useCallback((gameId: string, round: number) => socketRef.current?.send('sketch:clear', {gameId, round}) ?? false, []);

  const guess = useCallback((gameId: string, round: number, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const sent = socketRef.current?.send('sketch:guess', {gameId, round, text: trimmed}) ?? false;
    if (sent) setState(s => ({...s, myGuesses: [...s.myGuesses, {text: trimmed}]}));
    return sent;
  }, []);

  const startVote = useCallback(() => socketRef.current?.send('tonight:vote-start', {}) ?? false, []);
  const castVote = useCallback((voteId: string, phase: string, yes: number[]) => {
    const sent = socketRef.current?.send('tonight:vote', {voteId, yes}) ?? false;
    if (sent) setState(s => ({...s, myVote: `${voteId}:${phase}`}));
    return sent;
  }, []);
  const voteNext = useCallback((voteId: string) => socketRef.current?.send('tonight:vote-next', {voteId}) ?? false, []);
  const endVote = useCallback((voteId: string) => socketRef.current?.send('tonight:vote-end', {voteId}) ?? false, []);

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
  setMeRef.current = setMe;

  /** Add a person (no `profileId`) or edit one. `claim`: the new person is whoever holds this phone. */
  const saveProfile = useCallback(
    (profile: {profileId?: string; name: string; color: string; avatar: string; kid?: boolean}, claim = false) => {
      const name = profile.name.trim();
      if (!name) return false;
      const sent = socketRef.current?.send('profile:save', {...profile, name}) ?? false;
      if (sent && claim && !profile.profileId) claimRef.current = true;
      return sent;
    },
    [],
  );

  return {
    ...state,
    switchProfiles,
    sendMessage,
    addEvent,
    removeEvent,
    setDevice,
    ringDoor,
    setMe,
    saveProfile,
    requestTonight,
    ask,
    resetChat,
    startQuiz,
    answerQuiz,
    nextGameStep,
    endGame,
    startSketch,
    sendStroke,
    clearSketch,
    guess,
    startVote,
    castVote,
    voteNext,
    endVote,
  };
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
