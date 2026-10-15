import React, {useEffect, useRef} from 'react';
import {BackHandler, findNodeHandle, StyleSheet, Text, View} from 'react-native';
import {FocusManager, TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {SmartDevice, THERMOSTAT_RANGE, deviceIsActive, deviceStateLabel} from '@huddle/shared';
import {FocusableCard} from '@huddle/tv-focus-kit';
import {useHousehold} from '../net/HouseholdContext';
import {colors, focus, radius, space, type} from '../theme';

type Props = {onClose: () => void};

/**
 * Simulated smart home: one row per device. Select flips a light or lock;
 * the thermostat gets Cooler / Warmer buttons. Phones see the same state live.
 * Focus is trapped here and Back closes it, like the Connect sheet.
 */
export function SmartHomeOverlay({onClose}: Props) {
  const {devices, setDevice, status} = useHousehold();
  const rootRef = useRef<View>(null);

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

  const online = status === 'open';

  return (
    <View ref={rootRef} style={styles.root} testID="smart-home-overlay">
      <View style={styles.backdrop} />
      <View style={styles.sheet}>
        <TVFocusGuideView trapFocusUp trapFocusDown trapFocusLeft trapFocusRight style={styles.sheetInner}>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.sub}>Simulated devices. Phones can flip them too.</Text>
          {!online ? <Text style={styles.sub}>Offline: changes will not reach the server.</Text> : null}
          {devices.map((d, i) => (
            <DeviceRow key={d.id} device={d} first={i === 0} onSet={change => setDevice(d.id, change)} />
          ))}
          <FocusableCard
            testID="smart-home-done"
            hasTVPreferredFocus={devices.length === 0}
            onPress={onClose}
            accessibilityLabel="Done, close"
            ringColor={colors.focusRing}
            ringWidth={focus.borderWidth}
            radius={radius.pill}
            animationDuration={focus.duration}
            containerStyle={styles.doneWrap}
            style={styles.done}>
            <Text style={styles.buttonText}>Done</Text>
          </FocusableCard>
        </TVFocusGuideView>
      </View>
    </View>
  );
}

function DeviceRow({device, first, onSet}: {device: SmartDevice; first: boolean; onSet: (change: {on?: boolean; level?: number}) => void}) {
  const state = deviceStateLabel(device);
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.name}>{device.name}</Text>
        <Text style={styles.room}>{device.room}</Text>
      </View>
      <Text style={[styles.state, deviceIsActive(device) && styles.stateOn]} testID={`smart-state-${device.id}`}>
        {state}
      </Text>
      {device.kind === 'thermostat' ? (
        <>
          <Button
            testID={`smart-${device.id}-down`}
            label="Cooler"
            preferred={first}
            disabled={(device.level ?? THERMOSTAT_RANGE.min) <= THERMOSTAT_RANGE.min}
            onPress={() => onSet({level: (device.level ?? 21) - 1})}
          />
          <Button
            testID={`smart-${device.id}-up`}
            label="Warmer"
            disabled={(device.level ?? THERMOSTAT_RANGE.max) >= THERMOSTAT_RANGE.max}
            onPress={() => onSet({level: (device.level ?? 21) + 1})}
          />
        </>
      ) : (
        <Button
          testID={`smart-${device.id}`}
          label={toggleLabel(device)}
          preferred={first}
          onPress={() => onSet({on: !device.on})}
        />
      )}
    </View>
  );
}

function toggleLabel(d: SmartDevice): string {
  if (d.kind === 'lock') return d.on ? 'Unlock' : 'Lock';
  return d.on ? 'Turn off' : 'Turn on';
}

function Button({label, onPress, testID, preferred, disabled}: {label: string; onPress: () => void; testID: string; preferred?: boolean; disabled?: boolean}) {
  return (
    <FocusableCard
      testID={testID}
      hasTVPreferredFocus={preferred}
      onPress={disabled ? undefined : onPress}
      accessibilityLabel={label}
      ringColor={colors.focusRing}
      ringWidth={focus.borderWidth}
      radius={radius.pill}
      animationDuration={focus.duration}
      containerStyle={styles.buttonWrap}
      style={[styles.button, disabled && styles.buttonDisabled]}
      focusedStyle={styles.buttonFocused}>
      <Text style={styles.buttonText}>{label}</Text>
    </FocusableCard>
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
    width: 1200,
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
    marginBottom: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    borderTopWidth: 2,
    borderTopColor: colors.surfaceRaised,
  },
  rowText: {
    flex: 1,
  },
  name: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '700',
  },
  room: {
    color: colors.mute,
    fontSize: type.chip,
  },
  state: {
    color: colors.mute,
    fontSize: type.body,
    fontWeight: '700',
    width: 220,
    textAlign: 'right',
    marginRight: space.lg,
  },
  stateOn: {
    color: colors.success,
  },
  buttonWrap: {
    marginLeft: space.sm,
  },
  button: {
    minWidth: 200,
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  buttonFocused: {
    backgroundColor: colors.accent,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '700',
  },
  doneWrap: {
    alignSelf: 'flex-start',
    marginTop: space.lg,
  },
  done: {
    backgroundColor: colors.accent,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
});
