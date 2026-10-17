import React, {useEffect, useRef, useState} from 'react';
import {Animated, Image, StyleSheet, Text, View} from 'react-native';
import {clockTime, DoorEvent} from '@huddle/shared';
import {useHousehold} from '../net/HouseholdContext';
import {colors, radius, space, type} from '../theme';

export const DOOR_ALERT_MS = 15000;

export function doorTitle(ev: DoorEvent): string {
  return ev.kind === 'ring' ? 'Someone is at the door' : 'Motion at the door';
}

/**
 * Doorbell ring or motion, bottom left: away from the header (Connect phone)
 * and opposite the message toast (bottom right).
 * Not focusable: it tells the room, it does not take the remote.
 */
export function DoorAlert() {
  const {latestDoor} = useHousehold();
  const [shown, setShown] = useState<DoorEvent | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!latestDoor) return;
    setShown(latestDoor);
    opacity.setValue(0);
    Animated.timing(opacity, {toValue: 1, duration: 220, useNativeDriver: true}).start();
    const hide = setTimeout(() => {
      Animated.timing(opacity, {toValue: 0, duration: 300, useNativeDriver: true}).start(() => setShown(null));
    }, DOOR_ALERT_MS);
    return () => clearTimeout(hide);
  }, [latestDoor, opacity]);

  if (!shown) return null;
  const title = doorTitle(shown);
  const meta = `${shown.camera} · ${clockTime(new Date(shown.at))}`;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.card, {opacity, transform: [{translateY: opacity.interpolate({inputRange: [0, 1], outputRange: [24, 0]})}]}]}
      testID="door-alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${title}. ${meta}`}>
      {shown.snapshotUrl ? <Image source={{uri: shown.snapshotUrl}} style={styles.snapshot} resizeMode="cover" /> : null}
      <View style={styles.body}>
        <View style={[styles.dot, shown.kind === 'ring' ? styles.ring : styles.motion]} />
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: space.safeY,
    left: space.safeX,
    width: 640,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 3,
    borderColor: colors.focusRing,
    overflow: 'hidden',
  },
  snapshot: {
    width: '100%',
    height: 360,
    backgroundColor: colors.surface,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: space.md,
  },
  ring: {
    backgroundColor: colors.danger,
  },
  motion: {
    backgroundColor: colors.mute,
  },
  text: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: type.title,
    fontWeight: '700',
  },
  meta: {
    color: colors.mute,
    fontSize: type.body,
    marginTop: 4,
  },
});
