import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {FocusableCard} from '@huddle/tv-focus-kit';
import {useHousehold} from '../net/HouseholdContext';
import {Avatar, Button, focusLook} from '../components/ui';
import {colors, space, type} from '../theme';

type Props = {
  initialSelected: string[];
  onContinue: (profileIds: string[]) => void;
};

/** "Who's here?": multi-select people, like Vega's profile picker. Select toggles, Continue goes home. */
export function WhoHereScreen({initialSelected, onContinue}: Props) {
  const {profiles} = useHousehold();
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const toggle = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Who's here?</Text>

      <TVFocusGuideView autoFocus style={styles.row}>
        {profiles.map((p, index) => {
          const isOn = selected.includes(p.id);
          return (
            <View key={p.id} style={styles.person}>
              <FocusableCard
                testID={`profile-${p.id}`}
                hasTVPreferredFocus={index === 0}
                onPress={() => toggle(p.id)}
                accessibilityLabel={`${p.name}, ${isOn ? 'here' : 'not here'}`}
                {...focusLook}
                radius={AVATAR / 2}
                focusScale={1.08}
                style={styles.avatarButton}>
                <Avatar name={p.name} color={p.color} size={AVATAR} dim={!isOn} />
              </FocusableCard>
              <Text style={[styles.name, !isOn && styles.nameOff]}>{p.name}</Text>
              <View style={[styles.check, isOn && styles.checkOn]} testID={isOn ? `here-${p.id}` : undefined}>
                <Text style={styles.checkMark}>{isOn ? '✓' : ''}</Text>
              </View>
            </View>
          );
        })}
      </TVFocusGuideView>

      <Button
        testID="continue"
        primary
        label={`Continue${selected.length ? ` with ${selected.length}` : ''}`}
        accessibilityLabel="Continue to home"
        onPress={() => onContinue(selected.length ? selected : ['guest'])}
      />
    </View>
  );
}

const AVATAR = 160;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.safeX,
    paddingVertical: space.safeY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.ink,
    fontSize: type.hero,
    fontWeight: '500',
    marginBottom: space.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: space.xl,
  },
  person: {
    alignItems: 'center',
    marginHorizontal: space.md,
  },
  avatarButton: {
    width: AVATAR,
    height: AVATAR,
  },
  name: {
    color: colors.ink,
    fontSize: type.body,
    marginTop: space.md,
  },
  nameOff: {
    color: colors.mute,
  },
  check: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginTop: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.ink,
  },
  checkMark: {
    color: colors.bg,
    fontSize: type.chip,
    fontWeight: '700',
  },
});
