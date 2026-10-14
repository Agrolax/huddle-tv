import React from 'react';
import {StyleSheet, View} from 'react-native';

export interface FocusRingProps {
  visible: boolean;
  color?: string;
  width?: number;
  /** Match the card's border radius. */
  radius?: number;
}

/**
 * A border drawn on top of a card instead of around it, so focusing never
 * shifts layout and never depends on `overflow: visible`.
 */
export function FocusRing({visible, color = '#F5A524', width = 4, radius = 16}: FocusRingProps) {
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      testID="focus-ring"
      style={[StyleSheet.absoluteFill, {borderColor: color, borderWidth: width, borderRadius: radius}]}
    />
  );
}
