import {useEffect, useRef, useState} from 'react';
import {GUESS_MAX_LENGTH, GameState, Profile, SKETCH_COLORS, STROKE_POINTS_MAX, Stroke} from '@huddle/shared';

/** Same shape as the TV board; points are 0..1 of it. */
const ASPECT = 4 / 3;
const PEN_WIDTH = 0.012;
/** Send what's drawn this often, so the TV follows the pen. */
const FLUSH_MS = 50;
/** Skip points closer than this (share of the width): less traffic, same line. */
const MIN_STEP = 0.004;

let strokeCount = 0;

/** The drawer's canvas: draws locally at once and streams the line to the TV in short pieces. */
export function DrawPad({
  gameId,
  round,
  onStroke,
  onClear,
}: {
  gameId: string;
  round: number;
  onStroke: (gameId: string, round: number, stroke: Stroke) => boolean;
  onClear: (gameId: string, round: number) => boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(SKETCH_COLORS[0]!);
  const current = useRef<{id: string; color: string; pending: Stroke['points']; last: {x: number; y: number}} | null>(null);

  const flush = () => {
    const c = current.current;
    if (!c || !c.pending.length) return;
    for (let i = 0; i < c.pending.length; i += STROKE_POINTS_MAX) {
      onStroke(gameId, round, {id: c.id, color: c.color, width: PEN_WIDTH, points: c.pending.slice(i, i + STROKE_POINTS_MAX)});
    }
    c.pending = [];
  };

  useEffect(() => {
    const t = setInterval(flush, FLUSH_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, round]);

  // Size the bitmap to the element so lines stay sharp.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientWidth * ratio / ASPECT;
  }, [gameId, round]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height)};
  };

  const line = (a: {x: number; y: number}, b: {x: number; y: number}, stroke: string) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = PEN_WIDTH * canvas.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
    ctx.lineTo(b.x * canvas.width + (a === b ? 0.5 : 0), b.y * canvas.height);
    ctx.stroke();
  };

  return (
    <div className="stack">
      <canvas
        ref={canvasRef}
        className="draw-pad"
        data-testid="draw-pad"
        aria-label="Drawing area"
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = point(e);
          current.current = {id: `s${Date.now().toString(36)}${(strokeCount++).toString(36)}`, color, pending: [p], last: p};
          line(p, p, color);
        }}
        onPointerMove={e => {
          const c = current.current;
          if (!c) return;
          const p = point(e);
          if (Math.hypot(p.x - c.last.x, p.y - c.last.y) < MIN_STEP) return;
          line(c.last, p, c.color);
          c.pending.push(p);
          c.last = p;
        }}
        onPointerUp={() => {
          flush();
          current.current = null;
        }}
        onPointerCancel={() => {
          flush();
          current.current = null;
        }}
      />
      <div className="row">
        {SKETCH_COLORS.map(c => (
          <button
            key={c}
            className={`swatch ${c === color ? 'on' : ''}`}
            style={{background: c}}
            aria-label={`Pen color ${c}`}
            aria-pressed={c === color}
            onClick={() => setColor(c)}
          />
        ))}
        <span className="grow" />
        <button
          className="link"
          onClick={() => {
            const canvas = canvasRef.current!;
            canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
            onClear(gameId, round);
          }}>
          Clear
        </button>
      </div>
    </div>
  );
}

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Sketch the pick on the phone: draw when it's your turn, otherwise guess the movie. */
export function SketchPlay({
  game,
  profiles,
  meId,
  prompt,
  myGuesses,
  othersGot,
  onStroke,
  onClear,
  onGuess,
  onNext,
  onEnd,
  disabled,
}: {
  game: GameState;
  profiles: Profile[];
  meId?: string;
  prompt?: {gameId: string; round: number; prompt: string};
  myGuesses: Array<{text: string; correct?: boolean}>;
  othersGot: string[];
  onStroke: (gameId: string, round: number, stroke: Stroke) => boolean;
  onClear: (gameId: string, round: number) => boolean;
  onGuess: (gameId: string, round: number, text: string) => boolean;
  onNext: (gameId: string) => boolean;
  onEnd: (gameId: string) => boolean;
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const name = (id?: string) => profiles.find(p => p.id === id)?.name ?? 'Someone';
  const gameId = game.gameId!;
  const reveal = game.phase === 'reveal';
  const drawing = game.drawerId === meId;
  const got = myGuesses.some(g => g.correct);
  const myPrompt = prompt && prompt.gameId === gameId && prompt.round === game.round ? prompt.prompt : undefined;

  let body: React.ReactNode;
  if (reveal) {
    const gained = meId ? game.gained?.[meId] : undefined;
    body = (
      <>
        <h2 className="question">It was {game.answer}</h2>
        <p className="small" aria-live="polite" data-testid="sketch-status">
          {gained ? `+${gained} points.` : drawing ? 'Nobody got it this time.' : 'Not this time.'}
        </p>
      </>
    );
  } else if (drawing) {
    body = (
      <>
        <h2 className="question" data-testid="sketch-prompt">
          Draw: {myPrompt ?? '…'}
        </h2>
        <p className="muted small">No letters or numbers. The others guess on their phones.</p>
        <DrawPad key={`${gameId}-${game.round}`} gameId={gameId} round={game.round} onStroke={onStroke} onClear={onClear} />
      </>
    );
  } else {
    body = (
      <>
        <h2 className="question">{name(game.drawerId)} is drawing. Look at the TV.</h2>
        <p className="hint" aria-label={`${game.hint?.length ?? 0} characters`}>
          {game.hint}
        </p>
        {!meId ? (
          <p className="muted small">Tap your name at the top to guess.</p>
        ) : got ? (
          <p className="small ok-text" data-testid="sketch-status">
            You got it. Wait for the others.
          </p>
        ) : (
          <form
            className="row"
            onSubmit={e => {
              e.preventDefault();
              if (onGuess(gameId, game.round, text)) setText('');
            }}>
            <input
              aria-label="Your guess"
              placeholder="Which movie is it?"
              value={text}
              maxLength={GUESS_MAX_LENGTH}
              onChange={e => setText(e.target.value)}
              disabled={disabled}
            />
            <button type="submit" className="primary" disabled={disabled || !text.trim()}>
              Guess
            </button>
          </form>
        )}
        <ul className="list small" data-testid="sketch-guesses">
          {myGuesses.map((g, i) => (
            <li key={i} className={g.correct ? 'ok-text' : g.correct === false ? 'muted' : ''}>
              {g.text} {g.correct ? '· right' : g.correct === false ? '· no' : ''}
            </li>
          ))}
          {othersGot.map(id => (
            <li key={id} className="muted">
              {name(id)} got it
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <section className="card game" data-testid="game">
      <p className="eyebrow">
        Sketch the pick · Round {game.round} of {game.rounds}
      </p>
      {body}
      <div className="row">
        <button className="link" onClick={() => onNext(gameId)} disabled={disabled}>
          {reveal ? 'Next round' : 'Show answer'}
        </button>
        <span className="grow" />
        <button className="link" onClick={() => onEnd(gameId)} disabled={disabled}>
          End game
        </button>
      </div>
    </section>
  );
}
