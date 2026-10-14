import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Focusable} from '../components/Focusable';
import {colors, space, type} from '../theme';

type Props = {
  appName: string;
  status: 'opening' | 'failed';
  message?: string;
  onBack: () => void;
};

export function LaunchingScreen({appName, status, message, onBack}: Props) {
  const [focused, setFocused] = React.useState(true);

  useEffect(() => {
    if (status === 'opening') {
      const t = setTimeout(onBack, 2500);
      return () => clearTimeout(t);
    }
  }, [status, onBack]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>
        {status === 'opening' ? `Opening ${appName}…` : `Couldn't open ${appName}`}
      </Text>
      {message ? <Text style={styles.sub}>{message}</Text> : null}
      {status === 'failed' ? (
        <Focusable
          focused={focused}
          onFocus={() => setFocused(true)}
          onPress={onBack}
          hasTVPreferredFocus
          accessibilityLabel="Back to home"
          style={styles.cta}>
          <Text style={styles.ctaText}>Back to home</Text>
        </Focusable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.safeX,
    paddingVertical: space.safeY,
    justifyContent: 'center',
  },
  title: {
    color: colors.ink,
    fontSize: type.hero,
    fontWeight: '700',
    marginBottom: space.md,
  },
  sub: {
    color: colors.mute,
    fontSize: type.body,
    marginBottom: space.lg,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  ctaText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '700',
  },
});
