import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {FocusableCard} from '@huddle/tv-focus-kit';
import {useHousehold} from '../net/HouseholdContext';
import {ConnectOverlay} from '../components/ConnectOverlay';
import {Avatar, Button, focusLook, restoreFocus} from '../components/ui';
import {colors, radius, space, type} from '../theme';

type Props = {
  initialSelected: string[];
  onContinue: (profileIds: string[]) => void;
};

/**
 * "Who's here?": square person tiles, multi-select, like Vega's profile picker.
 * Select toggles, Continue goes home. "Add someone" shows the QR; the new person
 * is typed in on a phone and arrives here already selected.
 */
export function WhoHereScreen({initialSelected, onContinue}: Props) {
  const {profiles} = useHousehold();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [adding, setAdding] = useState(false);
  const known = useRef(new Set(profiles.map(p => p.id)));
  const addRef = useRef<View>(null);
  const closeAdd = () => {
    setAdding(false);
    // Focus goes back to the tile that opened the sheet.
    setTimeout(() => restoreFocus(addRef.current), 0);
  };

  useEffect(() => {
    const fresh = profiles.filter(p => !known.current.has(p.id)).map(p => p.id);
    known.current = new Set(profiles.map(p => p.id));
    if (!fresh.length || !adding) return;
    setSelected(prev => [...prev, ...fresh.filter(id => !prev.includes(id))]);
    closeAdd();
  }, [profiles, adding]);

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
                radius={radius.lg}
                focusScale={1.06}
                style={[styles.tile, isOn && styles.tileOn]}>
                <Avatar profile={p} size={BLOB} dim={!isOn} />
                <View style={[styles.check, isOn && styles.checkOn]} testID={isOn ? `here-${p.id}` : undefined}>
                  <Text style={styles.checkMark}>{isOn ? '✓' : ''}</Text>
                </View>
              </FocusableCard>
              <Text style={[styles.name, !isOn && styles.nameOff]}>{p.name}</Text>
            </View>
          );
        })}
        <View style={styles.person}>
          <FocusableCard
            ref={addRef}
            testID="profile-add"
            onPress={() => setAdding(true)}
            accessibilityLabel="Add someone. Finish on your phone"
            {...focusLook}
            radius={radius.lg}
            focusScale={1.06}
            style={[styles.tile, styles.addTile]}>
            <Text style={styles.plus}>+</Text>
          </FocusableCard>
          <Text style={[styles.name, styles.nameOff]}>Add someone</Text>
        </View>
      </TVFocusGuideView>

      <Button
        testID="continue"
        primary
        label={`Continue${selected.length ? ` with ${selected.length}` : ''}`}
        accessibilityLabel="Continue to home"
        onPress={() => onContinue(selected.length ? selected : ['guest'])}
      />
      {adding ? <ConnectOverlay purpose="add" onClose={closeAdd} /> : null}
    </View>
  );
}

const TILE = 220;
const BLOB = 150;

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
    marginHorizontal: space.sm,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOn: {
    backgroundColor: colors.surfaceRaised,
  },
  addTile: {
    borderWidth: 3,
    borderColor: colors.surfaceRaised,
    backgroundColor: colors.bg,
  },
  plus: {
    color: colors.mute,
    fontSize: 96,
    fontWeight: '300',
  },
  name: {
    color: colors.ink,
    fontSize: type.body,
    marginTop: space.sm,
  },
  nameOff: {
    color: colors.mute,
  },
  check: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
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
