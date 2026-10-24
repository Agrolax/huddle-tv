import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TMDB_ATTRIBUTION, TONIGHT_MOODS, TonightPick, TonightPicks} from '@huddle/shared';
import {namesFor} from '../data/profiles';
import {useHousehold} from '../net/HouseholdContext';
import {colors, radius, space, type} from '../theme';
import {FocusableCard} from '@huddle/tv-focus-kit';
import {Avatar, Button, Sheet, focusLook, useSecondsLeft} from './ui';
import {Backdrop} from './Backdrop';

type Props = {onClose: () => void};

/** Picks were made for exactly the people who are here now. */
export function picksAreFor(tonight: TonightPicks | null, profileIds: string[]): boolean {
  if (!tonight) return false;
  const a = [...tonight.forProfileIds].sort().join(',');
  const b = [...profileIds].sort().join(',');
  return a === b;
}

/** "1 h 44 min", "50 min". */
export function runtime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

/** The line under the sheet title: who it's for, and when it has to end. */
export function tonightSubtitle(names: string, tonight: TonightPicks | null): string {
  const ends = tonight?.endsBy;
  return ends ? `For ${names} · Ends by ${ends.label} (${ends.reason})` : `For ${names}`;
}

/**
 * Tonight: three picks for whoever is here, from Bedrock (or the mock).
 * Opens with fresh picks if the room changed; the mood buttons ask again.
 * "Vote on phones" starts the secret veto: each phone says yes or no in
 * private, and the TV only shows who has voted, then the overlap.
 */
export function TonightOverlay({onClose}: Props) {
  const {tonight, tonightLoading, requestTonight, activeProfileIds, profiles, status, vote} = useHousehold();
  const names = namesFor(activeProfileIds, profiles);
  const current = picksAreFor(tonight, activeProfileIds) ? tonight : null;
  const online = status === 'open';

  // New people on the couch (or no picks yet): ask once on open.
  const askedOnOpen = useRef(false);
  useEffect(() => {
    if (askedOnOpen.current || current || tonightLoading || !online || vote.phase !== 'idle') return;
    askedOnOpen.current = requestTonight();
  }, [current, tonightLoading, online, requestTonight, vote.phase]);

  if (tonight && vote.phase !== 'idle') {
    return (
      <Sheet testID="tonight-overlay" title="Tonight" subtitle={tonightSubtitle(names, tonight)} onClose={onClose} width={1560}>
        <VoteView tonight={tonight} />
      </Sheet>
    );
  }

  return <PicksView current={current} onClose={onClose} names={names} />;
}

function PicksView({current, onClose, names}: {current: TonightPicks | null; onClose: () => void; names: string}) {
  const {tonightLoading, requestTonight, status, startVote, serverUrl} = useHousehold();
  const online = status === 'open';
  const selectedMood = current?.mood;
  const canVote = online && !tonightLoading && (current?.picks.length ?? 0) >= 2;
  const [hero, setHero] = useState(current?.chosen ?? 0);
  const shown = tonightLoading ? undefined : current?.picks[hero] ?? current?.picks[0];

  return (
    <Sheet
      testID="tonight-overlay"
      title="Tonight"
      subtitle={tonightSubtitle(names, current)}
      onClose={onClose}
      width={1560}
      backdrop={shown ? <Backdrop pick={shown} serverUrl={serverUrl} testID="tonight-backdrop" /> : undefined}>
      <View style={styles.moods}>
        {TONIGHT_MOODS.map((m, i) => (
          <Button
            key={m.id}
            testID={`tonight-mood-${m.id}`}
            label={m.label}
            accessibilityLabel={`${m.label} picks${selectedMood === m.id ? ', selected' : ''}`}
            selected={selectedMood === m.id}
            preferred={selectedMood ? selectedMood === m.id : i === 0}
            disabled={!online}
            onPress={() => requestTonight(m.id)}
            containerStyle={styles.moodGap}
          />
        ))}
      </View>
      {shown ? (
        <View style={styles.hero} testID="tonight-hero">
          <Text style={styles.heroTitle} numberOfLines={1}>
            {shown.title}
          </Text>
          <Text style={styles.heroMeta}>{metaLine(shown)}</Text>
          <Text style={styles.heroWhy} numberOfLines={2}>
            {shown.why}
          </Text>
        </View>
      ) : (
        <View style={styles.hero} />
      )}
      <View style={styles.picks} testID="tonight-picks">
        {tonightLoading ? (
          <Text style={styles.status} testID="tonight-loading">
            Getting picks…
          </Text>
        ) : current ? (
          current.picks.map((p, i) => (
            <PickCard
              key={`${p.title}-${i}`}
              pick={p}
              index={i}
              tag={current.chosen === i ? "Tonight's pick" : undefined}
              onFocus={() => setHero(i)}
              focused={hero === i}
            />
          ))
        ) : (
          <Text style={styles.status}>{online ? 'Select a mood.' : 'The TV is offline.'}</Text>
        )}
      </View>
      <View style={styles.footer}>
        <Button
          testID="tonight-vote"
          label="Vote on phones"
          accessibilityLabel="Vote on phones. Everyone says yes or no in private"
          primary
          disabled={!canVote}
          onPress={startVote}
          containerStyle={styles.moodGap}
        />
        <Button testID="tonight-done" label="Done" onPress={onClose} />
        {current?.source === 'mock' && !tonightLoading ? (
          <Text style={styles.note} testID="tonight-demo-note">
            Demo picks
          </Text>
        ) : current?.source === 'bedrock' && !tonightLoading ? (
          <Text style={styles.note} testID="tonight-source">
            Picked by Amazon Nova{current.picks.some(p => p.image) ? ' · art by Nova Canvas' : ''}
          </Text>
        ) : null}
      </View>
      {current ? <TmdbCredit picks={current.picks} /> : null}
    </Sheet>
  );
}

/** "2017 · Prime Video · 1 h 44 min". */
function metaLine(pick: TonightPick): string {
  return [pick.year, pick.service, pick.minutes ? runtime(pick.minutes) : undefined].filter(Boolean).join(' · ');
}

/** Voting progress (who has voted, never how), then the overlap or the sudden-death winner. */
function VoteView({tonight}: {tonight: TonightPicks}) {
  const {vote, profiles, companions, voteNext, endVote, startVote, status} = useHousehold();
  const secondsLeft = useSecondsLeft(vote.phase === 'result' ? undefined : vote.endsAt);
  const online = status === 'open';
  const voterIds = [...new Set([...companions.filter(c => c.role === 'phone' && c.profileId).map(c => c.profileId!), ...vote.voted])];
  const voters = profiles.filter(p => voterIds.includes(p.id));
  const name = (i: number | undefined) => (i === undefined ? '' : tonight.picks[i]?.title ?? '');

  if (vote.phase === 'result') {
    const accepted = vote.accepted ?? [];
    const line =
      vote.decidedBy === 'nobody'
        ? 'Nobody voted.'
        : vote.decidedBy === 'sudden-death'
          ? `Sudden death: ${name(vote.winner)} wins.`
          : accepted.length === 1
            ? `Everyone said yes to ${name(vote.winner)}.`
            : `Everyone said yes to ${accepted.length} picks. Tonight: ${name(vote.winner)}.`;
    return (
      <View testID="vote-result">
        <Text style={styles.voteHeading}>{line}</Text>
        <View style={styles.picks}>
          {tonight.picks.map((p, i) => (
            <PickCard
              key={`${p.title}-${i}`}
              pick={p}
              index={i}
              tag={vote.winner === i ? "Tonight's pick" : accepted.includes(i) ? 'Everyone said yes' : undefined}
              dim={vote.winner !== undefined && vote.winner !== i && !accepted.includes(i)}
            />
          ))}
        </View>
        <View style={styles.footer} key="result">
          <Button testID="vote-done" label="Done" primary preferred onPress={endVote} containerStyle={styles.moodGap} />
          <Button testID="vote-again" label="Vote again" disabled={!online} onPress={startVote} />
        </View>
        <TmdbCredit picks={tonight.picks} />
      </View>
    );
  }

  const sudden = vote.phase === 'sudden-death';
  return (
    <View testID="vote-progress">
      <Text style={styles.voteHeading}>{sudden ? 'No pick suits everyone. Sudden death: choose one on your phone.' : 'Vote on your phones. Nobody sees your vote.'}</Text>
      <View style={styles.picks}>
        {vote.options.map(i => {
          const p = tonight.picks[i];
          return p ? <PickCard key={`${p.title}-${i}`} pick={p} index={i} /> : null;
        })}
      </View>
      <View style={styles.people} testID="vote-voted">
        {voters.map(p => (
          <View key={p.id} style={styles.person}>
            <Avatar profile={p} size={56} dim={!vote.voted.includes(p.id)} />
            <Text style={styles.personText}>{vote.voted.includes(p.id) ? 'Voted' : 'Waiting'}</Text>
          </View>
        ))}
        <Text style={styles.note}>
          {voters.length ? `${vote.voted.length} of ${voters.length} voted` : 'Connect a phone to vote.'}
          {secondsLeft !== null ? ` · ${secondsLeft} s` : ''}
        </Text>
      </View>
      <View style={styles.footer} key={vote.phase}>
        <Button testID="vote-next" label="Show result" preferred onPress={voteNext} containerStyle={styles.moodGap} />
        <Button testID="vote-end" label="Stop vote" onPress={endVote} />
      </View>
      <TmdbCredit picks={tonight.picks} />
    </View>
  );
}

function TmdbCredit({picks}: {picks: TonightPick[]}) {
  if (!picks.some(p => p.posterUrl)) return null;
  return (
    <Text style={styles.credit} testID="tmdb-credit">
      {TMDB_ATTRIBUTION}
    </Text>
  );
}

/**
 * A pick as a poster: its art on top, title and details below. In the picks row
 * it takes focus and puts its art behind the sheet; in the vote it is just a card.
 */
function PickCard({
  pick,
  index,
  tag,
  dim,
  onFocus,
  focused,
}: {
  pick: TonightPick;
  index: number;
  tag?: string;
  dim?: boolean;
  onFocus?: () => void;
  focused?: boolean;
}) {
  const {serverUrl} = useHousehold();
  const meta = metaLine(pick);
  const body = (
    <>
      <View style={styles.thumb}>
        <Backdrop pick={pick} serverUrl={serverUrl} />
      </View>
      <View style={styles.pickText}>
        {tag ? <Text style={styles.tag}>{tag}</Text> : null}
        <Text style={styles.pickTitle} numberOfLines={1}>
          {pick.title}
        </Text>
        {meta ? <Text style={styles.pickMeta}>{meta}</Text> : null}
        {onFocus ? null : (
          <Text style={styles.pickWhy} numberOfLines={2}>
            {pick.why}
          </Text>
        )}
      </View>
    </>
  );
  const look = [styles.pick, tag !== undefined && styles.pickTagged, dim && styles.dim, focused && styles.pickFocused];
  if (!onFocus) {
    return (
      <View style={[look, index > 0 && styles.pickGap]} testID={`tonight-pick-${index}`}>
        {body}
      </View>
    );
  }
  return (
    <FocusableCard
      testID={`tonight-pick-${index}`}
      onFocus={onFocus}
      onPress={onFocus}
      accessibilityLabel={`${pick.title}. ${meta}. ${pick.why}`}
      {...focusLook}
      radius={radius.md}
      focusScale={1.03}
      containerStyle={[styles.pickSlot, index > 0 && styles.pickGap]}
      style={look}>
      {body}
    </FocusableCard>
  );
}

const styles = StyleSheet.create({
  moods: {
    flexDirection: 'row',
    marginTop: space.md,
  },
  moodGap: {
    marginRight: space.sm,
  },
  picks: {
    flexDirection: 'row',
    minHeight: 280,
    alignItems: 'stretch',
  },
  hero: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: space.lg,
    maxWidth: 1300,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 72,
    fontWeight: '800',
  },
  heroMeta: {
    color: colors.ink,
    fontSize: type.body,
    marginTop: space.xs,
  },
  heroWhy: {
    color: colors.ink,
    fontSize: type.title,
    marginTop: space.sm,
  },
  thumb: {
    height: 150,
    overflow: 'hidden',
  },
  pickText: {
    padding: space.md,
  },
  pickSlot: {
    flex: 1,
  },
  pickFocused: {
    backgroundColor: colors.surfaceRaised,
  },
  status: {
    color: colors.mute,
    fontSize: type.body,
    alignSelf: 'center',
  },
  pick: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  pickGap: {
    marginLeft: space.md,
  },
  pickTagged: {
    borderWidth: 4,
    borderColor: colors.success,
  },
  dim: {
    opacity: 0.35,
  },
  tag: {
    color: colors.success,
    fontSize: type.chip,
    fontWeight: '700',
    marginBottom: space.xs,
  },
  voteHeading: {
    color: colors.ink,
    fontSize: type.title,
    fontWeight: '700',
    marginTop: space.lg,
    marginBottom: space.lg,
  },
  people: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 110,
    marginTop: space.md,
  },
  person: {
    alignItems: 'center',
    marginRight: space.md,
  },
  personText: {
    color: colors.mute,
    fontSize: type.chip,
    marginTop: 4,
  },
  pickTitle: {
    color: colors.ink,
    fontSize: type.title,
    fontWeight: '700',
  },
  pickMeta: {
    color: colors.mute,
    fontSize: type.chip,
    marginTop: space.xs,
  },
  pickWhy: {
    color: colors.ink,
    fontSize: type.body,
    marginTop: space.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.lg,
  },
  note: {
    color: colors.mute,
    fontSize: type.chip,
    marginLeft: space.lg,
  },
  credit: {
    color: colors.mute,
    fontSize: type.chip,
    marginTop: space.md,
  },
});
