import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {FocusableCard} from '@huddle/tv-focus-kit';
import {useHousehold} from '../net/HouseholdContext';
import {colors, focus, radius, space, type} from '../theme';

type Props = {
  initialSelected: string[];
  onContinue: (profileIds: string[]) => void;
};

/** "Who's here?": multi-select profiles. Select toggles, Continue goes home. */
export function WhoHereScreen({initialSelected, onContinue}: Props) {
  const {profiles} = useHousehold();
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const toggle = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Who's here?</Text>
      <Text style={styles.sub}>Pick everyone in the room. Select again to remove someone.</Text>

      <TVFocusGuideView autoFocus style={styles.row}>
        {profiles.map((p, index) => {
          const isOn = selected.includes(p.id);
          return (
            <FocusableCard
              key={p.id}
              testID={`profile-${p.id}`}
              hasTVPreferredFocus={index === 0}
              onPress={() => toggle(p.id)}
              accessibilityLabel={`${p.name}${isOn ? ', selected' : ''}`}
              ringColor={colors.focus}
              ringWidth={focus.borderWidth}
              radius={radius.lg}
              focusScale={1.08}
              animationDuration={focus.duration}
              containerStyle={styles.cardWrap}
              style={styles.card}
              focusedStyle={styles.cardFocused}>
              <View style={[styles.avatar, {backgroundColor: p.color}, !isOn && styles.avatarOff]}>
                <Text style={styles.avatarLetter}>{p.name[0]}</Text>
              </View>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={[styles.check, isOn && styles.checkOn]}>{isOn ? 'Here' : 'Not here'}</Text>
            </FocusableCard>
          );
        })}
      </TVFocusGuideView>

      <FocusableCard
        testID="continue"
        onPress={() => onContinue(selected.length ? selected : ['guest'])}
        accessibilityLabel="Continue to home"
        ringColor={colors.focusRing}
        ringWidth={focus.borderWidth}
        radius={radius.pill}
        animationDuration={focus.duration}
        containerStyle={styles.ctaWrap}
        style={styles.cta}>
        <Text style={styles.ctaText}>Continue{selected.length ? ` with ${selected.length}` : ''}</Text>
      </FocusableCard>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.safeX,
    paddingVertical: space.safeY,
    justifyContent: 'center',
  },
  title: {
    color: colors.ink,
    fontSize: type.hero,
    fontWeight: '700',
    marginBottom: space.sm,
  },
  sub: {
    color: colors.mute,
    fontSize: type.body,
    marginBottom: space.xl,
  },
  row: {
    flexDirection: 'row',
    marginBottom: space.xl,
  },
  cardWrap: {
    width: 240,
    marginRight: space.lg,
  },
  card: {
    alignItems: 'center',
    paddingVertical: space.lg,
    backgroundColor: colors.surface,
  },
  cardFocused: {
    backgroundColor: colors.surfaceRaised,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  avatarOff: {
    opacity: 0.35,
  },
  avatarLetter: {
    color: colors.bg,
    fontSize: type.hero,
    fontWeight: '700',
  },
  name: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '700',
  },
  check: {
    color: colors.mute,
    fontSize: type.caption,
    marginTop: space.xs,
  },
  checkOn: {
    color: colors.success,
    fontWeight: '700',
  },
  ctaWrap: {
    alignSelf: 'flex-start',
  },
  cta: {
    backgroundColor: colors.accent,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  ctaText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '700',
  },
});
