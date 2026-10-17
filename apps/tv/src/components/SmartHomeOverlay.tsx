import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SmartDevice, THERMOSTAT_RANGE, deviceIsActive, deviceStateLabel} from '@huddle/shared';
import {useHousehold} from '../net/HouseholdContext';
import {colors, space, type} from '../theme';
import {Button, Sheet} from './ui';

type Props = {onClose: () => void};

/**
 * Simulated smart home: one row per device. Select changes a light or lock;
 * the thermostat gets Cooler / Warmer. Phones see the same state live.
 */
export function SmartHomeOverlay({onClose}: Props) {
  const {devices, setDevice, status} = useHousehold();
  return (
    <Sheet
      testID="smart-home-overlay"
      title="Home"
      subtitle={status === 'open' ? 'Demo devices' : 'The TV is offline. Your changes are not saved.'}
      onClose={onClose}
      width={1200}>
      <View style={styles.list}>
        {devices.map((d, i) => (
          <DeviceRow key={d.id} device={d} first={i === 0} onSet={change => setDevice(d.id, change)} />
        ))}
      </View>
      <Button testID="smart-home-done" label="Done" onPress={onClose} preferred={devices.length === 0} containerStyle={styles.done} />
    </Sheet>
  );
}

function DeviceRow({device, first, onSet}: {device: SmartDevice; first: boolean; onSet: (change: {on?: boolean; level?: number}) => void}) {
  const level = device.level ?? 21;
  return (
    <View style={styles.row}>
      <Text style={styles.name}>{device.name}</Text>
      <Text style={[styles.state, !deviceIsActive(device) && styles.stateOff]} testID={`smart-state-${device.id}`}>
        {deviceStateLabel(device)}
      </Text>
      {device.kind === 'thermostat' ? (
        <>
          <Button
            testID={`smart-${device.id}-down`}
            label="Cooler"
            preferred={first}
            disabled={level <= THERMOSTAT_RANGE.min}
            onPress={() => onSet({level: level - 1})}
            containerStyle={styles.gap}
          />
          <Button
            testID={`smart-${device.id}-up`}
            label="Warmer"
            disabled={level >= THERMOSTAT_RANGE.max}
            onPress={() => onSet({level: level + 1})}
            containerStyle={styles.gap}
          />
        </>
      ) : (
        <Button
          testID={`smart-${device.id}`}
          label={toggleLabel(device)}
          preferred={first}
          onPress={() => onSet({on: !device.on})}
          containerStyle={styles.gap}
        />
      )}
    </View>
  );
}

function toggleLabel(d: SmartDevice): string {
  if (d.kind === 'lock') return d.on ? 'Unlock' : 'Lock';
  return d.on ? 'Turn off' : 'Turn on';
}

const styles = StyleSheet.create({
  list: {
    marginTop: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
  },
  name: {
    flex: 1,
    color: colors.ink,
    fontSize: type.body,
  },
  state: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '700',
    marginRight: space.lg,
  },
  stateOff: {
    color: colors.mute,
    fontWeight: '400',
  },
  gap: {
    marginLeft: space.sm,
  },
  done: {
    alignSelf: 'flex-start',
    marginTop: space.lg,
  },
});
