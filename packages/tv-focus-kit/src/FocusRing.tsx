import React from 'react';
import {StyleSheet, View} from 'react-native';

export interface FocusRingProps {
  visible: boolean;
  color?: string;
  width?: number;
  /** Match the card's border radius. */
  radius?: number;
  /**
   * Space between the card and the ring. 0 draws the ring on top of the card's
   * edge; > 0 draws it outside with a gap, like the Vega OS home.
   */
  gap?: number;
}

/**
 * A ring drawn as an absolutely positioned overlay, so focusing never shifts
 * layout. With a gap it sits outside the card; the parent must not clip it.
 */
export function FocusRing({visible, color = '#FFFFFF', width = 4, radius = 16, gap = 0}: FocusRingProps) {
  if (!visible) return null;
  const outset = gap > 0 ? gap + width : 0;
  return (
    <View
      pointerEvents="none"
      testID="focus-ring"
      style={[
        StyleSheet.absoluteFill,
        {
          top: -outset,
          left: -outset,
          right: -outset,
          bottom: -outset,
          borderColor: color,
          borderWidth: width,
          borderRadius: radius + outset,
        },
      ]}
    />
  );
}
