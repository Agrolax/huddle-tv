import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {Focusable} from '../components/Focusable';
import {PROFILES} from '../data/profiles';
import {colors, space, type} from '../theme';

type Props = {
  onContinue: (profileIds: string[]) => void;
};

export function WhoHereScreen({onContinue}: Props) {
  const [selected, setSelected] = useState<string[]>(['rafi', 'nanu']);
  const [focusedId, setFocusedId] = useState<string>(PROFILES[0].id);

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id],
    );
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Who's here?</Text>
      <Text style={styles.sub}>Pick everyone in the room. Select again to toggle.</Text>

      <TVFocusGuideView style={styles.row}>
        {PROFILES.map((p, index) => {
          const isOn = selected.includes(p.id);
          const focused = focusedId === p.id;
          return (
            <Focusable
              key={p.id}
              focused={focused}
              onFocus={() => setFocusedId(p.id)}
              onPress={() => toggle(p.id)}
              hasTVPreferredFocus={index === 0}
              accessibilityLabel={`${p.name}${isOn ? ', selected' : ''}`}
              style={styles.avatarWrap}>
              <View style={[styles.avatar, {backgroundColor: p.color}]}>
                <Text style={styles.avatarLetter}>{p.name[0]}</Text>
              </View>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.check}>{isOn ? '●' : '○'}</Text>
            </Focusable>
          );
        })}
      </TVFocusGuideView>

      <Focusable
        focused={focusedId === 'continue'}
        onFocus={() => setFocusedId('continue')}
        onPress={() => onContinue(selected.length ? selected : ['guest'])}
        accessibilityLabel="Continue to home"
        style={styles.cta}>
        <Text style={styles.ctaText}>
          Continue{selected.length ? ` · ${selected.length}` : ''}
        </Text>
      </Focusable>
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
    gap: space.md,
    marginBottom: space.xl,
  },
  avatarWrap: {
    width: 180,
    alignItems: 'center',
    padding: space.sm,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  avatarLetter: {
    color: colors.ink,
    fontSize: type.title,
    fontWeight: '700',
  },
  name: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '600',
  },
  check: {
    color: colors.focus,
    fontSize: type.body,
    marginTop: space.xs,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  ctaText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '700',
  },
});
