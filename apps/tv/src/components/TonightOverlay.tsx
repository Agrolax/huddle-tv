import React, {useEffect, useRef} from 'react';
import {BackHandler, findNodeHandle, StyleSheet, Text, View} from 'react-native';
import {FocusManager, TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {TONIGHT_MOODS, TonightMood, TonightPick, TonightPicks} from '@huddle/shared';
import {FocusableCard} from '@huddle/tv-focus-kit';
import {namesFor} from '../data/profiles';
import {useHousehold} from '../net/HouseholdContext';
import {colors, focus, radius, space, type} from '../theme';

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
 * Focus is trapped here and Back closes it, like the Home sheet.
 */
export function TonightOverlay({onClose}: Props) {
  const {tonight, tonightLoading, requestTonight, activeProfileIds, profiles, status} = useHousehold();
  const rootRef = useRef<View>(null);
  const names = namesFor(activeProfileIds, profiles);
  const current = picksAreFor(tonight, activeProfileIds) ? tonight : null;
  const online = status === 'open';

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub?.remove();
  }, [onClose]);

  useEffect(() => {
    const handle = rootRef.current ? findNodeHandle(rootRef.current) : null;
    try {
      if (handle) FocusManager.setFocusRoot(handle, true);
    } catch {
      // Device-only API; the guide view traps still apply in tests.
    }
    return () => {
      try {
        if (handle) FocusManager.setFocusRoot(handle, false);
      } catch {
        // ignore
      }
    };
  }, []);

  // New people on the couch (or no picks yet): ask once on open.
  const askedOnOpen = useRef(false);
  useEffect(() => {
    if (askedOnOpen.current || current || tonightLoading || !online) return;
    askedOnOpen.current = requestTonight();
  }, [current, tonightLoading, online, requestTonight]);

  const selectedMood = current?.mood;

  return (
    <View ref={rootRef} style={styles.root} testID="tonight-overlay">
      <View style={styles.backdrop} />
      <View style={styles.sheet}>
        <TVFocusGuideView trapFocusUp trapFocusDown trapFocusLeft trapFocusRight style={styles.sheetInner}>
          <Text style={styles.title}>Tonight</Text>
          <Text style={styles.sub}>For {names}. Pick a mood.</Text>
          <View style={styles.moods}>
            {TONIGHT_MOODS.map((m, i) => (
              <MoodButton
                key={m.id}
                mood={m.id}
                label={m.label}
                selected={selectedMood === m.id}
                preferred={selectedMood ? selectedMood === m.id : i === 0}
                disabled={!online}
                onPress={() => requestTonight(m.id)}
              />
            ))}
          </View>
          <View style={styles.picks} testID="tonight-picks">
            {tonightLoading ? (
              <Text style={styles.status} testID="tonight-loading">
                Finding picks for {names}…
              </Text>
            ) : current ? (
              current.picks.map((p, i) => <PickCard key={`${p.title}-${i}`} pick={p} index={i} />)
            ) : (
              <Text style={styles.status}>{online ? 'Pick a mood to get three ideas.' : 'Offline: Tonight needs the Huddle server.'}</Text>
            )}
          </View>
          <View style={styles.footer}>
            <FocusableCard
              testID="tonight-done"
              onPress={onClose}
              accessibilityLabel="Done, close"
              ringColor={colors.focusRing}
              ringWidth={focus.borderWidth}
              radius={radius.pill}
              animationDuration={focus.duration}
              style={styles.done}>
              <Text style={styles.buttonText}>Done</Text>
            </FocusableCard>
            {current?.source === 'mock' && !tonightLoading ? (
              <Text style={styles.note} testID="tonight-demo-note">
                Demo picks. Bedrock is off.
              </Text>
            ) : null}
          </View>
        </TVFocusGuideView>
      </View>
    </View>
  );
}

function MoodButton({
  mood,
  label,
  selected,
  preferred,
  disabled,
  onPress,
}: {
  mood: TonightMood;
  label: string;
  selected: boolean;
  preferred: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <FocusableCard
      testID={`tonight-mood-${mood}`}
      hasTVPreferredFocus={preferred}
      onPress={disabled ? undefined : onPress}
      accessibilityLabel={`${label} picks${selected ? ', selected' : ''}`}
      ringColor={colors.focusRing}
      ringWidth={focus.borderWidth}
      radius={radius.pill}
      animationDuration={focus.duration}
      containerStyle={styles.moodWrap}
      style={[styles.mood, selected && styles.moodSelected, disabled && styles.disabled]}
      focusedStyle={styles.moodFocused}>
      <Text style={styles.buttonText}>{label}</Text>
    </FocusableCard>
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
      <Text style={styles.pickWhy} numberOfLines={4}>
        {pick.why}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    opacity: 0.94,
  },
  sheet: {
    width: 1500,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sheetInner: {
    padding: space.xl,
  },
  title: {
    color: colors.ink,
    fontSize: type.hero,
    fontWeight: '700',
  },
  sub: {
    color: colors.mute,
    fontSize: type.body,
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  moods: {
    flexDirection: 'row',
    marginBottom: space.lg,
  },
  moodWrap: {
    marginRight: space.md,
  },
  mood: {
    minWidth: 260,
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  moodSelected: {
    borderColor: colors.widget.tonight,
  },
  moodFocused: {
    backgroundColor: colors.accent,
  },
  disabled: {
    opacity: 0.4,
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
    backgroundColor: colors.board,
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
    color: colors.widget.tonight,
    fontSize: type.chip,
    fontWeight: '700',
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
  done: {
    backgroundColor: colors.accent,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  buttonText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '700',
  },
  note: {
    color: colors.mute,
    fontSize: type.chip,
    marginLeft: space.lg,
  },
});
