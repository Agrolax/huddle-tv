import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, space, type} from '../theme';

interface Props {
  label: string;
  children: React.ReactNode;
}

/** Shared chrome for every home-screen widget: a small grey title, then the content. No accents, no hints. */
export function WidgetTile({label, children}: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: space.md,
  },
  label: {
    color: colors.mute,
    fontSize: type.chip,
    fontWeight: '500',
    marginBottom: space.sm,
  },
  body: {
    flex: 1,
  },
});
