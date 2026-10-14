import React, {useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {Focusable} from '../components/Focusable';
import {PROFILES} from '../data/profiles';
import {STREAMING_APPS, StreamingApp} from '../data/streamingApps';
import {colors, space, type} from '../theme';

type Props = {
  profileIds: string[];
  onLaunchApp: (app: StreamingApp) => void;
  onSwitchProfiles: () => void;
};

type FocusKey =
  | `app:${string}`
  | 'weather'
  | 'board'
  | 'switch';

export function HomeScreen({profileIds, onLaunchApp, onSwitchProfiles}: Props) {
  const names = useMemo(
    () =>
      PROFILES.filter(p => profileIds.includes(p.id))
        .map(p => p.name)
        .join(' & '),
    [profileIds],
  );

  const [focused, setFocused] = useState<FocusKey>(`app:${STREAMING_APPS[0].id}`);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const time = new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.title}>
            {greeting}, {names || 'everyone'}
          </Text>
          <Text style={styles.sub}>Echo status later · {time} · 14° clear</Text>
        </View>
        <Focusable
          focused={focused === 'switch'}
          onFocus={() => setFocused('switch')}
          onPress={onSwitchProfiles}
          accessibilityLabel="Switch who's here"
          style={styles.switchChip}>
          <Text style={styles.switchText}>Who's here</Text>
        </Focusable>
      </View>

      <Text style={styles.section}>Your apps</Text>
      <TVFocusGuideView style={styles.appsRow}>
        {STREAMING_APPS.map((app, index) => {
          const key: FocusKey = `app:${app.id}`;
          const isFocused = focused === key;
          return (
            <Focusable
              key={app.id}
              focused={isFocused}
              onFocus={() => setFocused(key)}
              onPress={() => onLaunchApp(app)}
              hasTVPreferredFocus={index === 0}
              accessibilityLabel={`Open ${app.name}`}
              style={[styles.appTile, {backgroundColor: app.color}]}>
              <Text style={styles.appName}>{app.name}</Text>
            </Focusable>
          );
        })}
      </TVFocusGuideView>

      <Text style={styles.section}>Widgets</Text>
      <TVFocusGuideView style={styles.widgets}>
        <Focusable
          focused={focused === 'weather'}
          onFocus={() => setFocused('weather')}
          onPress={() => {}}
          accessibilityLabel="Weather"
          style={styles.weather}>
          <Text style={styles.widgetTitle}>14°</Text>
          <Text style={styles.widgetBody}>Clear · {time}</Text>
        </Focusable>
        <Focusable
          focused={focused === 'board'}
          onFocus={() => setFocused('board')}
          onPress={() => {}}
          accessibilityLabel="Family board"
          style={styles.board}>
          <Text style={styles.widgetTitle}>Family board</Text>
          <Text style={styles.widgetBody}>"Pizza night" · from the Echo</Text>
          <Text style={styles.widgetBody}>"Take out recycling" · Rafi</Text>
        </Focusable>
      </TVFocusGuideView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.safeX,
    paddingVertical: space.safeY,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: space.lg,
  },
  heroText: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: type.hero,
    fontWeight: '700',
    marginBottom: space.xs,
  },
  sub: {
    color: colors.mute,
    fontSize: type.body,
  },
  switchChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  switchText: {
    color: colors.ink,
    fontSize: type.caption,
    fontWeight: '600',
  },
  section: {
    color: colors.mute,
    fontSize: type.caption,
    marginBottom: space.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  appsRow: {
    flexDirection: 'row',
    gap: space.md,
    marginBottom: space.lg,
  },
  appTile: {
    flex: 1,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: type.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  widgets: {
    flexDirection: 'row',
    gap: space.md,
    flex: 1,
  },
  weather: {
    width: 280,
    backgroundColor: colors.surface,
    padding: space.md,
    justifyContent: 'center',
  },
  board: {
    flex: 1,
    backgroundColor: colors.board,
    padding: space.md,
    justifyContent: 'center',
  },
  widgetTitle: {
    color: colors.ink,
    fontSize: type.title,
    fontWeight: '700',
    marginBottom: space.sm,
  },
  widgetBody: {
    color: colors.mute,
    fontSize: type.body,
    marginBottom: space.xs,
  },
});
