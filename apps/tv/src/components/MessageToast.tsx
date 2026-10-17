import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import type {FamilyMessage} from '@huddle/shared';
import {useHousehold} from '../net/HouseholdContext';
import {colors, radius, space, type} from '../theme';

export const TOAST_MS = 8000;

/** 10-foot toast for messages from phones: who sent it + the text. Not focusable; never steals focus. */
export function MessageToast() {
  const {latestMessage, senderName, profiles} = useHousehold();
  const [shown, setShown] = useState<FamilyMessage | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!latestMessage) return;
    setShown(latestMessage);
    opacity.setValue(0);
    Animated.timing(opacity, {toValue: 1, duration: 220, useNativeDriver: true}).start();
    const hide = setTimeout(() => {
      Animated.timing(opacity, {toValue: 0, duration: 300, useNativeDriver: true}).start(() => setShown(null));
    }, TOAST_MS);
    return () => clearTimeout(hide);
  }, [latestMessage, opacity]);

  if (!shown) return null;
  const sender = senderName(shown);
  const color = profiles.find(p => p.id === shown.fromProfileId)?.color ?? colors.mute;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, {opacity, transform: [{translateY: opacity.interpolate({inputRange: [0, 1], outputRange: [24, 0]})}]}]}
      testID="message-toast"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Message from ${sender}: ${shown.text}`}>
      <View style={[styles.avatar, {backgroundColor: color}]}>
        <Text style={styles.avatarLetter}>{sender[0]}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.from}>{sender}</Text>
        <Text style={styles.text} numberOfLines={3}>
          {shown.text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    right: space.safeX,
    bottom: space.safeY,
    width: 760,
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 3,
    borderColor: colors.focusRing,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  avatarLetter: {
    color: colors.bg,
    fontSize: type.title,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  from: {
    color: colors.mute,
    fontSize: type.chip,
    fontWeight: '700',
    marginBottom: 4,
  },
  text: {
    color: colors.ink,
    fontSize: type.title,
    fontWeight: '700',
  },
});
