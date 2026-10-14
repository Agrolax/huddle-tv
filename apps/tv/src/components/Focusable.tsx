import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {colors, focusStyle} from '../theme';

type Props = {
  children: React.ReactNode;
  focused: boolean;
  onFocus: () => void;
  onBlur?: () => void;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  hasTVPreferredFocus?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

/** D-pad focusable wrapper. Every interactive control should use this (or match its focus look). */
export function Focusable({
  children,
  focused,
  onFocus,
  onBlur,
  onPress,
  style,
  hasTVPreferredFocus,
  testID,
  accessibilityLabel,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={1}
      onFocus={onFocus}
      onBlur={onBlur}
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        focused && styles.focused,
        style,
        focused && {transform: [{scale: focusStyle.scale}]},
      ]}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: focusStyle.borderWidth,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  focused: {
    borderColor: colors.focus,
    backgroundColor: colors.surfaceRaised,
  },
});
