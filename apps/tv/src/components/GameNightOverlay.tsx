import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {GameState, Profile, choiceLetter, leaguePoints, standings} from '@huddle/shared';
import {useHousehold} from '../net/HouseholdContext';
import {colors, radius, space, type} from '../theme';
import {SketchBoard} from './SketchBoard';
import {Avatar, Button, Sheet, useSecondsLeft} from './ui';

type Props = {onClose: () => void};

/**
 * Game night: a quiz everyone answers on their phone. The TV shows the
 * question, who has answered, the reveal and the family league. The remote
 * only starts, skips and ends; it never answers.
 */
export function GameNightOverlay({onClose}: Props) {
  const {game, league, profiles, tonight, status, companions, startQuiz, startSketch, nextGameStep, endGame} = useHousehold();
  const online = status === 'open';
  const lastPick = tonight?.picks[tonight.chosen ?? 0]?.title;
  const phones = new Set(companions.filter(c => c.role === 'phone' && c.profileId).map(c => c.profileId)).size;

  if (game.kind === 'sketch' && (game.phase === 'question' || game.phase === 'reveal')) {
    return (
      <Sheet testID="game-overlay" title="Sketch the pick" subtitle={`Round ${game.round} of ${game.rounds} · The drawings are tonight's picks`} onClose={onClose} width={1640}>
        <SketchView />
        <View style={styles.footer} key={`${game.phase}-${game.round}`}>
          <Button
            testID="game-next"
            label={game.phase === 'question' ? 'Show answer' : game.round < game.rounds ? 'Next round' : 'See scores'}
            preferred
            primary={game.phase === 'reveal'}
            onPress={nextGameStep}
            containerStyle={styles.gap}
          />
          <Button testID="game-end" label="End game" onPress={endGame} />
        </View>
      </Sheet>
    );
  }

  if (game.phase === 'question' || game.phase === 'reveal') {
    return (
      <Sheet testID="game-overlay" title={game.title ?? 'Quiz'} subtitle={`Question ${game.round} of ${game.rounds}`} onClose={onClose} width={1640}>
        <QuestionView game={game} profiles={profiles} />
        <View style={styles.footer} key={`${game.phase}-${game.round}`}>
          <Button
            testID="game-next"
            label={game.phase === 'question' ? 'Show answer' : game.round < game.rounds ? 'Next question' : 'See scores'}
            preferred
            primary={game.phase === 'reveal'}
            onPress={nextGameStep}
            containerStyle={styles.gap}
          />
          <Button testID="game-end" label="End game" onPress={endGame} />
          {game.aiSource === 'mock' && game.source === 'watched-it' ? <Text style={styles.note}>Demo questions</Text> : null}
        </View>
      </Sheet>
    );
  }

  if (game.phase === 'loading') {
    return (
      <Sheet testID="game-overlay" title={game.title ?? 'Quiz'} subtitle="Writing questions…" onClose={onClose} width={1640}>
        <View style={styles.footer}>
          <Button testID="game-end" label="End game" preferred onPress={endGame} />
        </View>
      </Sheet>
    );
  }

  const final = game.phase === 'final';
  return (
    <Sheet
      testID="game-overlay"
      title={final ? `${game.title ?? 'Quiz'}: final scores` : 'Game night'}
      subtitle={final ? undefined : 'Everyone answers on their phone.'}
      onClose={onClose}
      width={1640}>
      <View style={styles.menu}>
        <View style={styles.column}>
          {final ? <ScoreList points={game.scores} profiles={profiles} testID="game-final" /> : null}
          <View style={styles.buttons} key={game.gameId ?? 'menu'}>
            <Button
              testID="game-start-our-week"
              label={final ? 'Play Our Week' : 'Our Week'}
              primary
              preferred
              disabled={!online}
              onPress={() => startQuiz('our-week')}
              containerStyle={styles.gap}
            />
            <Button
              testID="game-start-watched-it"
              label={lastPick ? `Watched It: ${shorten(lastPick, 22)}` : 'Watched It'}
              accessibilityLabel={lastPick ? `Watched It: ${lastPick}` : 'Watched It'}
              disabled={!online}
              onPress={() => startQuiz('watched-it', lastPick)}
              containerStyle={styles.gap}
            />
            <Button
              testID="game-start-sketch"
              label="Sketch the pick"
              accessibilityLabel={phones < 2 ? 'Sketch the pick. Connect two phones to play' : "Sketch the pick. Draw tonight's picks; the last one drawn is what you watch"}
              disabled={!online || phones < 2}
              onPress={startSketch}
            />
          </View>
          {final && game.kind === 'sketch' && game.answer ? (
            <Text style={[styles.mute, styles.pickLine]} testID="game-sketch-pick">
              Tonight: {game.answer}
            </Text>
          ) : null}
          {phones < 2 ? <Text style={styles.hint}>Sketch the pick needs two phones.</Text> : null}
          <View style={styles.footer}>
            <Button testID="game-done" label="Done" onPress={onClose} />
          </View>
          {!online ? <Text style={styles.note}>The TV is offline.</Text> : null}
        </View>
        <View style={[styles.column, styles.league]} testID="game-league">
          <Text style={styles.heading}>Family league</Text>
          {Object.keys(league).length ? (
            <ScoreList points={leaguePoints(league)} profiles={profiles} wins={league} />
          ) : (
            <Text style={styles.mute}>Play a quiz to start the league.</Text>
          )}
        </View>
      </View>
    </Sheet>
  );
}

/** The live drawing, who draws, the hint, and the guesses; the answer at the reveal. */
function SketchView() {
  const {game, profiles, canvas, guesses} = useHousehold();
  const reveal = game.phase === 'reveal';
  const secondsLeft = useSecondsLeft(game.phase === 'question' ? game.endsAt : undefined);
  const name = (id?: string) => profiles.find(p => p.id === id)?.name ?? 'Someone';
  const drawer = profiles.find(p => p.id === game.drawerId);
  const players = profiles.filter(p => p.id in (game.gained ?? {}));

  return (
    <View style={styles.sketch} testID="game-sketch">
      <SketchBoard strokes={canvas.strokes} width={880} />
      <View style={styles.sketchSide}>
        <View style={styles.drawerRow}>
          {drawer ? <Avatar profile={drawer} size={56} /> : null}
          <Text style={styles.drawerText}>{reveal ? `${name(game.drawerId)} drew` : `${name(game.drawerId)} is drawing`}</Text>
        </View>
        {reveal ? (
          <Text style={styles.answer} testID="game-sketch-answer">
            {game.answer}
          </Text>
        ) : (
          <Text style={styles.hintText} testID="game-sketch-hint" accessibilityLabel={`${game.hint?.length ?? 0} characters`}>
            {spaced(game.hint ?? '')}
          </Text>
        )}
        {reveal ? (
          <View style={styles.people} testID="game-gained">
            {players.length ? (
              players.map(p => (
                <View key={p.id} style={styles.person}>
                  <Avatar profile={p} size={56} />
                  <Text style={styles.points}>+{game.gained?.[p.id] ?? 0}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.mute}>Nobody got it.</Text>
            )}
          </View>
        ) : (
          <View testID="game-guesses">
            {guesses.map((g, i) => (
              <Text key={i} style={[styles.guess, g.correct && styles.guessRight]} numberOfLines={1}>
                {g.correct ? `${name(g.profileId)} got it` : `${name(g.profileId)}: ${g.text}`}
              </Text>
            ))}
            <Text style={styles.mute}>
              {guesses.length ? '' : 'Guess on your phone. '}
              {secondsLeft !== null ? `${secondsLeft} s` : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** "__ 2" → "_ _  2", so each hidden letter reads as a slot. */
function spaced(hint: string): string {
  return [...hint].map(c => (c === ' ' ? '  ' : c)).join(' ');
}

function QuestionView({game, profiles}: {game: GameState; profiles: Profile[]}) {
  const q = game.question;
  const reveal = game.phase === 'reveal';
  const secondsLeft = useSecondsLeft(game.phase === 'question' ? game.endsAt : undefined);
  if (!q) return null;
  const answered = profiles.filter(p => game.answered.includes(p.id));
  const players = profiles.filter(p => p.id in (game.choices ?? {}));

  return (
    <View testID="game-question">
      <Text style={styles.question}>{q.text}</Text>
      <View style={styles.choices}>
        {q.choices.map((choice, i) => {
          const right = reveal && game.correct === i;
          const dim = reveal && !right;
          return (
            <View
              key={i}
              testID={`game-choice-${i}`}
              accessibilityLabel={`${choiceLetter(i)}: ${choice}${right ? ', right answer' : ''}`}
              style={[styles.choice, right && styles.choiceRight, dim && styles.dim]}>
              <View style={[styles.letter, {backgroundColor: colors.choice[i]}]}>
                <Text style={styles.letterText}>{choiceLetter(i)}</Text>
              </View>
              <Text style={styles.choiceText} numberOfLines={2}>
                {choice}
              </Text>
              {right ? <Text style={styles.rightTag}>Right answer</Text> : null}
            </View>
          );
        })}
      </View>
      {reveal ? (
        <View style={styles.people} testID="game-gained">
          {players.length ? (
            players.map(p => {
              const points = game.gained?.[p.id] ?? 0;
              return (
                <View key={p.id} style={styles.person}>
                  <Avatar profile={p} size={56} dim={points === 0} />
                  <Text style={[styles.points, points === 0 && styles.mute]}>{points ? `+${points}` : '0'}</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.mute}>Nobody answered.</Text>
          )}
        </View>
      ) : (
        <View style={styles.people} testID="game-answered">
          {answered.map(p => (
            <View key={p.id} style={styles.person}>
              <Avatar profile={p} size={56} />
            </View>
          ))}
          <Text style={styles.mute}>
            {answered.length ? `${answered.length} answered` : 'Answer on your phone.'}
            {secondsLeft !== null ? ` · ${secondsLeft} s` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

function ScoreList({
  points,
  profiles,
  wins,
  testID,
}: {
  points: Record<string, number>;
  profiles: Profile[];
  wins?: Record<string, {wins: number}>;
  testID?: string;
}) {
  const rows = standings(
    points,
    profiles.map(p => p.id),
  );
  if (!rows.length) return <Text style={styles.mute}>Nobody answered.</Text>;
  return (
    <View testID={testID} style={styles.scores}>
      {rows.map(r => {
        const p = profiles.find(x => x.id === r.profileId);
        if (!p) return null;
        const w = wins?.[r.profileId]?.wins;
        return (
          <View key={r.profileId} style={styles.scoreRow} testID={`${testID ?? 'league'}-${r.profileId}`}>
            <Text style={styles.place}>{r.place}</Text>
            <Avatar profile={p} size={48} />
            <Text style={styles.scoreName}>{p.name}</Text>
            {w ? <Text style={styles.mute}>{w === 1 ? '1 win' : `${w} wins`}</Text> : null}
            <Text style={styles.scorePoints}>{r.points}</Text>
          </View>
        );
      })}
    </View>
  );
}

function shorten(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

const styles = StyleSheet.create({
  sketch: {
    flexDirection: 'row',
    marginTop: space.md,
  },
  sketchSide: {
    flex: 1,
    marginLeft: space.lg,
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.md,
  },
  drawerText: {
    color: colors.ink,
    fontSize: type.title,
    fontWeight: '700',
    marginLeft: space.sm,
  },
  hintText: {
    color: colors.ink,
    fontSize: type.title,
    fontWeight: '700',
    marginBottom: space.md,
  },
  answer: {
    color: colors.success,
    fontSize: type.hero,
    fontWeight: '700',
    marginBottom: space.md,
  },
  guess: {
    color: colors.ink,
    fontSize: type.body,
    marginBottom: space.xs,
  },
  guessRight: {
    color: colors.success,
    fontWeight: '700',
  },
  pickLine: {
    marginTop: space.md,
  },
  hint: {
    color: colors.mute,
    fontSize: type.chip,
    marginTop: space.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.lg,
  },
  gap: {
    marginRight: space.sm,
  },
  note: {
    color: colors.mute,
    fontSize: type.chip,
    marginLeft: space.md,
  },
  menu: {
    flexDirection: 'row',
    marginTop: space.lg,
  },
  column: {
    flex: 1.3,
  },
  league: {
    flex: 1,
    marginLeft: space.xl,
  },
  buttons: {
    flexDirection: 'row',
    marginTop: space.md,
  },
  heading: {
    color: colors.mute,
    fontSize: type.chip,
    fontWeight: '500',
    marginBottom: space.sm,
  },
  mute: {
    color: colors.mute,
    fontSize: type.body,
  },
  question: {
    color: colors.ink,
    fontSize: type.hero,
    fontWeight: '700',
    marginTop: space.md,
    marginBottom: space.lg,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  choice: {
    width: '49.3%',
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 4,
    borderColor: colors.surfaceRaised,
  },
  choiceRight: {
    borderColor: colors.success,
  },
  dim: {
    opacity: 0.35,
  },
  letter: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  letterText: {
    color: colors.ink,
    fontSize: type.title,
    fontWeight: '700',
  },
  choiceText: {
    flex: 1,
    color: colors.ink,
    fontSize: type.title,
    fontWeight: '700',
  },
  rightTag: {
    color: colors.success,
    fontSize: type.chip,
    fontWeight: '700',
    marginLeft: space.sm,
  },
  people: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 96,
    marginTop: space.sm,
  },
  person: {
    alignItems: 'center',
    marginRight: space.md,
  },
  points: {
    color: colors.ink,
    fontSize: type.chip,
    fontWeight: '700',
    marginTop: 4,
  },
  scores: {
    marginBottom: space.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  place: {
    color: colors.mute,
    fontSize: type.body,
    width: 40,
  },
  scoreName: {
    flex: 1,
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '700',
    marginLeft: space.sm,
  },
  scorePoints: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '700',
    marginLeft: space.md,
    minWidth: 100,
    textAlign: 'right',
  },
});
