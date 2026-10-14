import 'fast-text-encoding'; // Vega known issue: react-native-qrcode-svg needs TextEncoder.
import React, {useEffect, useRef, useState} from 'react';
import {
  findNodeHandle,
  BackHandler,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  FocusManager,
  TVFocusGuideView,
} from '@amazon-devices/react-native-kepler';
import QRCode from '@amazon-devices/react-native-qrcode-svg';
import {formatPairCode} from '@huddle/shared';
import {FocusableCard} from '@huddle/tv-focus-kit';
import {useHousehold} from '../net/HouseholdContext';
import {colors, focus, radius, space, type} from '../theme';

/** Ask for a new code this long before the current one expires. */
const REFRESH_BEFORE_MS = 30_000;

type Props = {onClose: () => void};

/**
 * Full-screen "Connect your phone" sheet: big QR, the code in text, and the URL.
 * Focus is trapped here while open (focus root + TVFocusGuideView traps) and Back closes it.
 */
export function ConnectOverlay({onClose}: Props) {
  const {
    status,
    statusDetail,
    serverUrl,
    pairCode,
    requestPairCode,
    companions,
    profiles,
  } = useHousehold();
  const rootRef = useRef<View>(null);
  const now = useNow(1000);

  useEffect(() => {
    requestPairCode();
  }, [requestPairCode]);

  // Refresh the code shortly before it expires, so a QR on screen always works.
  useEffect(() => {
    if (!pairCode) return;
    const wait = Math.max(
      0,
      pairCode.expiresAt - Date.now() - REFRESH_BEFORE_MS,
    );
    const t = setTimeout(requestPairCode, wait);
    return () => clearTimeout(t);
  }, [pairCode, requestPairCode]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub?.remove();
  }, [onClose]);

  useEffect(() => {
    // Make the sheet the focus root so D-pad can't reach the Home tiles behind it.
    const node = rootRef.current;
    const handle = node ? findNodeHandle(node) : null;
    try {
      if (handle) FocusManager.setFocusRoot(handle, true);
    } catch {
      // Not available off-device (tests); TVFocusGuideView traps still apply.
    }
    return () => {
      try {
        if (handle) FocusManager.setFocusRoot(handle, false);
      } catch {
        // ignore
      }
    };
  }, []);

  const online = status === 'open';
  const secondsLeft = pairCode
    ? Math.max(0, Math.round((pairCode.expiresAt - now) / 1000))
    : 0;
  const phones = companions.filter((c) => c.role === 'phone');

  return (
    <View ref={rootRef} style={styles.root} testID="connect-overlay">
      {/* Backdrop and sheet are siblings: on Vega a translucent parent background painted over its children. */}
      <View style={styles.backdrop} />
      <View style={styles.sheet}>
        <TVFocusGuideView
          trapFocusUp
          trapFocusDown
          trapFocusLeft
          trapFocusRight
          style={styles.sheetInner}>
          <View style={styles.qrColumn}>
            <View style={styles.qrTile} testID="connect-qr">
              {online && pairCode ? (
                <QRCode
                  value={pairCode.joinUrl}
                  size={QR_SIZE}
                  ecl="M"
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              ) : (
                <Text style={styles.qrPlaceholder}>
                  {online ? 'Getting a code…' : 'Offline'}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.textColumn}>
            <Text style={styles.title}>Connect your phone</Text>
            {online ? (
              <>
                <Text style={styles.step}>
                  1. Point your phone's camera at the code
                </Text>
                <Text style={styles.step}>
                  2. Open the link. No app to install
                </Text>
                <Text style={styles.label}>CODE</Text>
                <Text style={styles.code} testID="connect-code">
                  {pairCode ? formatPairCode(pairCode.code) : '··· ···'}
                </Text>
                <Text style={styles.label}>OR OPEN</Text>
                <Text style={styles.url} numberOfLines={2} testID="connect-url">
                  {pairCode?.joinUrl ?? ' '}
                </Text>
                <Text style={styles.meta}>
                  {pairCode
                    ? `Code refreshes in ${formatDuration(secondsLeft)}`
                    : ' '}
                  {phones.length
                    ? `  ·  ${phones.length} phone${
                        phones.length > 1 ? 's' : ''
                      } connected: ${phones
                        .map((p) => phoneLabel(p, profiles))
                        .join(', ')}`
                    : ''}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.step}>
                  The TV can't reach the Huddle server.
                </Text>
                <Text style={styles.url}>{serverUrl}</Text>
                <Text style={styles.meta}>
                  {status === 'reconnecting' ? 'Retrying…' : status}
                  {statusDetail ? ` · ${statusDetail}` : ''}
                </Text>
                <Text style={styles.meta}>On the Mac: npm run dev:server</Text>
              </>
            )}

            <FocusableCard
              testID="connect-done"
              hasTVPreferredFocus
              onPress={onClose}
              accessibilityLabel="Done, close"
              ringColor={colors.focusRing}
              ringWidth={focus.borderWidth}
              radius={radius.pill}
              animationDuration={focus.duration}
              containerStyle={styles.doneWrap}
              style={styles.done}>
              <Text style={styles.doneText}>Done</Text>
            </FocusableCard>
          </View>
        </TVFocusGuideView>
      </View>
    </View>
  );
}

function phoneLabel(
  client: {label?: string; profileId?: string},
  profiles: {id: string; name: string}[],
): string {
  const owner = profiles.find((p) => p.id === client.profileId)?.name;
  return owner ? `${owner}'s phone` : client.label ?? 'phone';
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

const QR_SIZE = 440;

const styles = StyleSheet.create({
  root: {
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
    opacity: 0.94,
  },
  sheet: {
    width: 1560,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sheetInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.xl,
  },
  qrColumn: {
    marginRight: space.xl,
  },
  qrTile: {
    width: QR_SIZE + 2 * 32,
    height: QR_SIZE + 2 * 32,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    color: '#333333',
    fontSize: type.body,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: type.hero,
    fontWeight: '700',
    marginBottom: space.md,
  },
  step: {
    color: colors.ink,
    fontSize: type.body,
    marginBottom: space.xs,
  },
  label: {
    color: colors.mute,
    fontSize: type.chip,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: space.lg,
    marginBottom: space.xs,
  },
  code: {
    color: colors.focus,
    fontSize: 88,
    fontWeight: '700',
    letterSpacing: 12,
  },
  url: {
    color: colors.ink,
    fontSize: type.body,
  },
  meta: {
    color: colors.mute,
    fontSize: type.chip,
    marginTop: space.md,
  },
  doneWrap: {
    alignSelf: 'flex-start',
    marginTop: space.lg,
  },
  done: {
    backgroundColor: colors.accent,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  doneText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '700',
  },
});
