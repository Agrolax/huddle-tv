import React, {useEffect, useRef} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TONIGHT_MOODS, TonightPick, TonightPicks} from '@huddle/shared';
import {namesFor} from '../data/profiles';
import {useHousehold} from '../net/HouseholdContext';
import {colors, radius, space, type} from '../theme';
import {Button, Sheet} from './ui';

type Props = {onClose: () => void};

/** Picks were made for exactly the people who are here now. */
export function picksAreFor(tonight: TonightPicks | null, profileIds: string[]): boolean {
  if (!tonight) return false;
  const a = [...tonight.forProfileIds].sort().join(',');
  const b = [...profileIds].sort().join(',');
  return a === b;
}

/**
 * Tonight: three picks for whoever is here, from Bedrock (or the mock).
 * Opens with fresh picks if the room changed; the mood buttons ask again.
 */
export function TonightOverlay({onClose}: Props) {
  const {tonight, tonightLoading, requestTonight, activeProfileIds, profiles, status} = useHousehold();
  const names = namesFor(activeProfileIds, profiles);
  const current = picksAreFor(tonight, activeProfileIds) ? tonight : null;
  const online = status === 'open';

  // New people on the couch (or no picks yet): ask once on open.
  const askedOnOpen = useRef(false);
  useEffect(() => {
    if (askedOnOpen.current || current || tonightLoading || !online) return;
    askedOnOpen.current = requestTonight();
  }, [current, tonightLoading, online, requestTonight]);

  const selectedMood = current?.mood;

  return (
    <Sheet testID="tonight-overlay" title="Tonight" subtitle={`For ${names}`} onClose={onClose} width={1560}>
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
      <View style={styles.picks} testID="tonight-picks">
        {tonightLoading ? (
          <Text style={styles.status} testID="tonight-loading">
            Getting picks…
          </Text>
        ) : current ? (
          current.picks.map((p, i) => <PickCard key={`${p.title}-${i}`} pick={p} index={i} />)
        ) : (
          <Text style={styles.status}>{online ? 'Select a mood.' : 'The TV is offline.'}</Text>
        )}
      </View>
      <View style={styles.footer}>
        <Button testID="tonight-done" label="Done" onPress={onClose} />
        {current?.source === 'mock' && !tonightLoading ? (
          <Text style={styles.note} testID="tonight-demo-note">
            Demo picks
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

function PickCard({pick, index}: {pick: TonightPick; index: number}) {
  const meta = [pick.year, pick.service].filter(Boolean).join(' · ');
  return (
    <View style={[styles.pick, index > 0 && styles.pickGap]} testID={`tonight-pick-${index}`}>
      <Text style={styles.pickTitle} numberOfLines={2}>
        {pick.title}
      </Text>
      {meta ? <Text style={styles.pickMeta}>{meta}</Text> : null}
      <Text style={styles.pickWhy} numberOfLines={3}>
        {pick.why}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  moods: {
    flexDirection: 'row',
    marginTop: space.lg,
    marginBottom: space.lg,
  },
  moodGap: {
    marginRight: space.sm,
  },
  picks: {
    flexDirection: 'row',
    minHeight: 300,
    alignItems: 'stretch',
  },
  status: {
    color: colors.mute,
    fontSize: type.body,
    alignSelf: 'center',
  },
  pick: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    padding: space.lg,
  },
  pickGap: {
    marginLeft: space.md,
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
});
