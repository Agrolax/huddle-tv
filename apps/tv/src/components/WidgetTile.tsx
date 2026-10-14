import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, space, type} from '../theme';

interface Props {
  label: string;
  accent: string;
  focused: boolean;
  children: React.ReactNode;
  /** One line at the bottom, shown brighter when focused (e.g. "Select to start"). */
  hint?: string;
}

/** Shared chrome for every home-screen widget: accent rule, label, body, hint. */
export function WidgetTile({label, accent, focused, children, hint}: Props) {
  return (
    <View style={styles.root}>
      <View style={[styles.rule, {backgroundColor: accent}]} />
      <Text style={[styles.label, {color: accent}]}>{label.toUpperCase()}</Text>
      <View style={styles.body}>{children}</View>
      {hint ? <Text style={[styles.hint, focused && styles.hintFocused]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: space.md,
  },
  rule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  label: {
    fontSize: type.chip,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  body: {
    flex: 1,
  },
  hint: {
    color: colors.mute,
    fontSize: type.chip,
  },
  hintFocused: {
    color: colors.ink,
  },
});
