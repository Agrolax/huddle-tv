import 'fast-text-encoding'; // Vega known issue: react-native-qrcode-svg needs TextEncoder.
import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import QRCode from '@amazon-devices/react-native-qrcode-svg';
import {formatPairCode} from '@huddle/shared';
import {useHousehold} from '../net/HouseholdContext';
import {colors, radius, space, type} from '../theme';
import {Button, Sheet} from './ui';

/** Ask for a new code this long before the current one expires. */
const REFRESH_BEFORE_MS = 30_000;

type Props = {onClose: () => void};

/**
 * "Connect your phone" sheet: big QR, the code in text, and the URL.
 * Focus is trapped here while open and Back closes it (see Sheet).
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
  const now = useNow(1000);

  useEffect(() => {
    requestPairCode();
  }, [requestPairCode]);

  // Refresh the code shortly before it expires, so a QR on screen always works.
  useEffect(() => {
    if (!pairCode) return;
    const wait = Math.max(0, pairCode.expiresAt - Date.now() - REFRESH_BEFORE_MS);
    const t = setTimeout(requestPairCode, wait);
    return () => clearTimeout(t);
  }, [pairCode, requestPairCode]);

  const online = status === 'open';
  const secondsLeft = pairCode ? Math.max(0, Math.round((pairCode.expiresAt - now) / 1000)) : 0;
  const phones = companions.filter(c => c.role === 'phone');

  return (
    <Sheet testID="connect-overlay" title="Connect your phone" onClose={onClose} width={1560}>
      <View style={styles.body}>
        <View style={styles.qrTile} testID="connect-qr">
          {online && pairCode ? (
            <QRCode value={pairCode.joinUrl} size={QR_SIZE} ecl="M" color="#000000" backgroundColor="#FFFFFF" />
          ) : (
            <Text style={styles.qrPlaceholder}>{online ? 'Getting a code…' : 'Offline'}</Text>
          )}
        </View>

        <View style={styles.textColumn}>
          {online ? (
            <>
              <Text style={styles.step}>Scan the code with your phone camera.</Text>
              <Text style={styles.code} testID="connect-code">
                {pairCode ? formatPairCode(pairCode.code) : '··· ···'}
              </Text>
              <Text style={styles.url} numberOfLines={2} testID="connect-url">
                {pairCode?.joinUrl ?? ' '}
              </Text>
              <Text style={styles.meta}>{pairCode ? `New code in ${formatDuration(secondsLeft)}` : ' '}</Text>
              {phones.length ? (
                <Text style={styles.meta} testID="connect-phones">
                  Connected: {phones.map(p => phoneLabel(p, profiles)).join(', ')}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.step}>The TV cannot connect to the Huddle server.</Text>
              <Text style={styles.url}>{serverUrl}</Text>
              <Text style={styles.meta}>
                {status === 'reconnecting' ? 'Connecting…' : 'Offline'}
                {__DEV__ && statusDetail ? ` · ${statusDetail}` : ''}
              </Text>
              {__DEV__ ? <Text style={styles.meta}>On the Mac: npm run dev:server</Text> : null}
            </>
          )}
          <Button testID="connect-done" label="Done" onPress={onClose} preferred containerStyle={styles.done} />
        </View>
      </View>
    </Sheet>
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
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.lg,
  },
  qrTile: {
    width: QR_SIZE + 2 * 32,
    height: QR_SIZE + 2 * 32,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.xl,
  },
  qrPlaceholder: {
    color: '#333333',
    fontSize: type.body,
  },
  textColumn: {
    flex: 1,
  },
  step: {
    color: colors.ink,
    fontSize: type.body,
  },
  code: {
    color: colors.ink,
    fontSize: 88,
    fontWeight: '700',
    letterSpacing: 12,
    marginTop: space.md,
  },
  url: {
    color: colors.mute,
    fontSize: type.chip,
  },
  meta: {
    color: colors.mute,
    fontSize: type.chip,
    marginTop: space.md,
  },
  done: {
    alignSelf: 'flex-start',
    marginTop: space.lg,
  },
});
