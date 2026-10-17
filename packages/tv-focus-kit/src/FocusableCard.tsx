import React, {forwardRef, useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {FocusRing} from './FocusRing';

/** TV-only props that React Native for Vega / react-native-tvos accept on Pressable. */
export interface TVFocusProps {
  hasTVPreferredFocus?: boolean;
  nextFocusUp?: number;
  nextFocusDown?: number;
  nextFocusLeft?: number;
  nextFocusRight?: number;
}

export interface FocusableCardProps extends TVFocusProps {
  children: React.ReactNode | ((state: {focused: boolean}) => React.ReactNode);
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Style of the outer animated wrapper (size, flex, margins). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Style of the pressable surface (background, padding). */
  style?: StyleProp<ViewStyle>;
  /** Extra style while focused (e.g. a lighter background). */
  focusedStyle?: StyleProp<ViewStyle>;
  /** Scale while focused. Leave room in the layout for it. Default 1.05. */
  focusScale?: number;
  ringColor?: string;
  ringWidth?: number;
  /** Gap between card and ring. 0 (default) draws the ring on the card edge. */
  ringGap?: number;
  radius?: number;
  /** ms. Default 160. Set 0 to respect reduce-motion. */
  animationDuration?: number;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A D-pad focusable card with an unmistakable focus state: scale + ring +
 * optional background change. Physical change, not colour alone.
 */
export const FocusableCard = forwardRef<View, FocusableCardProps>(function FocusableCard(
  {
    children,
    onPress,
    onFocus,
    onBlur,
    containerStyle,
    style,
    focusedStyle,
    focusScale = 1.05,
    ringColor,
    ringWidth,
    ringGap = 0,
    radius = 16,
    animationDuration = 160,
    accessibilityLabel,
    testID,
    ...tvProps
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const to = focused ? focusScale : 1;
    if (animationDuration <= 0) {
      scale.setValue(to);
      return;
    }
    const anim = Animated.timing(scale, {toValue: to, duration: animationDuration, useNativeDriver: true});
    anim.start();
    return () => anim.stop();
  }, [focused, focusScale, animationDuration, scale]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    onBlur?.();
  }, [onBlur]);

  // Pressable's public types do not include the TV props; React Native for Vega reads them at runtime.
  const tvPassThrough = tvProps as object;

  return (
    <Animated.View style={[{borderRadius: radius, transform: [{scale}]}, containerStyle]}>
      <Pressable
        ref={ref}
        onPress={onPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{selected: focused}}
        testID={testID}
        style={[styles.card, {borderRadius: radius}, style, focused && focusedStyle]}
        {...tvPassThrough}>
        {typeof children === 'function' ? children({focused}) : children}
        {ringGap > 0 ? null : <FocusRing visible={focused} color={ringColor} width={ringWidth} radius={radius} />}
      </Pressable>
      {/* The card clips its children, so an outset ring lives beside it. */}
      {ringGap > 0 ? <FocusRing visible={focused} color={ringColor} width={ringWidth} radius={radius} gap={ringGap} /> : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
