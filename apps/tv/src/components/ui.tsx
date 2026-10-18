/**
 * The few building blocks every TV screen uses, so color, focus and spacing
 * stay the same everywhere. Styled after the Fire TV home on Vega OS:
 * flat grey surfaces, white focus ring with a gap, one blue primary button.
 */
import React, {useEffect, useRef, useState} from 'react';
import {BackHandler, findNodeHandle, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {FocusManager, TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {FocusableCard} from '@huddle/tv-focus-kit';
import {colors, focus, radius, space, type} from '../theme';

/** Focus props for every focusable on the TV. */
export const focusLook = {
  ringColor: colors.focusRing,
  ringWidth: focus.borderWidth,
  ringGap: focus.gap,
  animationDuration: focus.duration,
} as const;

export function restoreFocus(node: View | null): void {
  try {
    const handle = node && findNodeHandle(node);
    if (handle) FocusManager.focus(handle);
  } catch {
    // FocusManager is device-only.
  }
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  testID?: string;
  /** Primary = blue fill. Use one per screen. */
  primary?: boolean;
  /** Shown as selected (e.g. the current mood). */
  selected?: boolean;
  disabled?: boolean;
  preferred?: boolean;
  accessibilityLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const Button = React.forwardRef<View, ButtonProps>(function Button(
  {label, onPress, testID, primary, selected, disabled, preferred, accessibilityLabel, containerStyle},
  ref,
) {
  return (
    <FocusableCard
      ref={ref}
      testID={testID}
      hasTVPreferredFocus={preferred}
      onPress={disabled ? undefined : onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      {...focusLook}
      radius={radius.pill}
      focusScale={1}
      containerStyle={containerStyle}
      style={[styles.button, primary && styles.primary, selected && styles.selected, disabled && styles.disabled]}
      focusedStyle={primary ? undefined : styles.buttonFocused}>
      {({focused}) => (
        <Text style={[styles.buttonText, selected && styles.selectedText, focused && !primary && styles.buttonTextFocused]}>{label}</Text>
      )}
    </FocusableCard>
  );
});

export function Avatar({name, color, size = 64, dim}: {name: string; color: string; size?: number; dim?: boolean}) {
  return (
    <View style={[styles.avatar, {width: size, height: size, borderRadius: size / 2, backgroundColor: color}, dim && styles.dim]}>
      <Text style={[styles.avatarLetter, {fontSize: Math.round(size * 0.42)}]}>{name[0]}</Text>
    </View>
  );
}

type SheetProps = {
  title: string;
  /** One short line under the title. */
  subtitle?: string;
  onClose: () => void;
  width?: number;
  testID: string;
  children: React.ReactNode;
};

/**
 * Full-screen modal sheet. The page dims, focus stays inside, Back closes.
 * The backdrop is a sibling of the card: on Vega a translucent parent paints over its children (FL-11).
 */
export function Sheet({title, subtitle, onClose, width = 1400, testID, children}: SheetProps) {
  const rootRef = useRef<View>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub?.remove();
  }, [onClose]);

  useEffect(() => {
    const handle = rootRef.current ? findNodeHandle(rootRef.current) : null;
    try {
      if (handle) FocusManager.setFocusRoot(handle, true);
    } catch {
      // Device-only API; the guide view traps still apply in tests.
    }
    return () => {
      try {
        if (handle) FocusManager.setFocusRoot(handle, false);
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <View ref={rootRef} style={styles.sheetRoot} testID={testID}>
      <View style={styles.backdrop} />
      <View style={[styles.sheet, {width}]}>
        <TVFocusGuideView trapFocusUp trapFocusDown trapFocusLeft trapFocusRight style={styles.sheetInner}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sheetSub}>{subtitle}</Text> : null}
          {children}
        </TVFocusGuideView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 200,
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  buttonFocused: {
    backgroundColor: colors.ink,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  selected: {
    borderWidth: 3,
    borderColor: colors.ink,
  },
  selectedText: {
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '500',
  },
  buttonTextFocused: {
    color: colors.bg,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: colors.bg,
    fontWeight: '700',
  },
  dim: {
    opacity: 0.3,
  },
  sheetRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    opacity: 0.92,
  },
  sheet: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sheetInner: {
    padding: space.xl,
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: type.hero,
    fontWeight: '700',
  },
  sheetSub: {
    color: colors.mute,
    fontSize: type.body,
    marginTop: space.xs,
  },
});

/** Whole seconds until `endsAt`, ticking once a second; null without a deadline. */
export function useSecondsLeft(endsAt: string | undefined): number | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!endsAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 1000));
}
