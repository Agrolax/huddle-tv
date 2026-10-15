import React, {useCallback, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {
  TONIGHT_MOODS,
  Weather,
  deviceIsActive,
  deviceStateLabel,
  eventWhen,
  upcomingEvents,
  weatherSummary,
} from '@huddle/shared';
import {FocusGrid, FocusGridHandle, FocusGridItem} from '@huddle/tv-focus-kit';
import {ConnectOverlay} from '../components/ConnectOverlay';
import {SmartHomeOverlay} from '../components/SmartHomeOverlay';
import {TonightOverlay, picksAreFor} from '../components/TonightOverlay';
import {WidgetTile} from '../components/WidgetTile';
import {Avatar, Button, focusLook, restoreFocus} from '../components/ui';
import {namesFor} from '../data/profiles';
import {useHousehold} from '../net/HouseholdContext';
import {formatDate, formatTime, greetingFor, useClock} from '../hooks/useClock';
import {colors, focus, radius, space, type} from '../theme';

export type WidgetId = 'clock' | 'calendar' | 'profiles' | 'tonight' | 'sketch' | 'smart-home';

type Props = {
  onSwitchProfiles: () => void;
  onOpenWidget?: (id: WidgetId) => void;
  onFocusChange?: (id: string) => void;
};

/**
 * Home: greeting and Connect phone, then a 4×2 widget grid. Tiles show content,
 * not instructions: focus says "you can select this".
 *
 *   clock       | calendar (2 wide) | profiles
 *   tonight (2 wide)  | sketch      | smart home
 */
export function HomeScreen({onSwitchProfiles, onOpenWidget, onFocusChange}: Props) {
  const now = useClock();
  const household = useHousehold();
  const {activeProfileIds: profileIds, profiles, status, events, devices, weather, tonight} = household;
  const names = namesFor(profileIds, profiles);
  const here = useMemo(() => profiles.filter(p => profileIds.includes(p.id)), [profiles, profileIds]);
  const upcoming = useMemo(() => upcomingEvents(events, now, 3), [events, now]);
  const [connectOpen, setConnectOpen] = useState(false);
  const [smartHomeOpen, setSmartHomeOpen] = useState(false);
  const [tonightOpen, setTonightOpen] = useState(false);
  const tonightFresh = picksAreFor(tonight, profileIds);
  const connectRef = useRef<View>(null);
  const gridRef = useRef<FocusGridHandle>(null);

  const closeConnect = useCallback(() => {
    setConnectOpen(false);
    // Give focus back to the chip that opened the overlay.
    setTimeout(() => restoreFocus(connectRef.current), 0);
  }, []);

  const closeSmartHome = useCallback(() => {
    setSmartHomeOpen(false);
    // Give focus back to the Home tile that opened the sheet.
    setTimeout(() => restoreFocus(gridRef.current?.getCell('smart-home') ?? null), 0);
  }, []);

  const closeTonight = useCallback(() => {
    setTonightOpen(false);
    setTimeout(() => restoreFocus(gridRef.current?.getCell('tonight') ?? null), 0);
  }, []);

  const items = useMemo<FocusGridItem[]>(
    () => [
      {
        id: 'clock',
        row: 0,
        col: 0,
        accessibilityLabel: `${formatTime(now)}, ${formatDate(now)}${weather ? `, ${weather.tempC} degrees, ${weatherSummary(weather.code)}` : ''}`,
        onPress: () => onOpenWidget?.('clock'),
        render: () => (
          <WidgetTile label={formatDate(now)}>
            <Text style={styles.clock}>{formatTime(now)}</Text>
            <Text style={styles.body} numberOfLines={1} testID="weather-line">
              {weather ? weatherText(weather) : ' '}
            </Text>
          </WidgetTile>
        ),
      },
      {
        id: 'calendar',
        row: 0,
        col: 1,
        colSpan: 2,
        accessibilityLabel: `Calendar. ${upcoming.length ? upcoming.map(e => `${e.title}, ${eventWhen(e.start, now)}`).join('. ') : 'No events'}`,
        onPress: () => onOpenWidget?.('calendar'),
        render: () => (
          <WidgetTile label="Calendar">
            {upcoming.length ? (
              upcoming.map(e => (
                <View key={e.id} style={styles.eventRow} testID={`event-${e.id}`}>
                  <Text style={styles.eventTime}>{eventWhen(e.start, now)}</Text>
                  <Text style={[styles.body, styles.grow]} numberOfLines={1}>
                    {e.title}
                  </Text>
                  <View style={styles.dots}>
                    {profiles
                      .filter(p => e.profileIds.includes(p.id))
                      .map(p => (
                        <View key={p.id} style={[styles.personDot, {backgroundColor: p.color}]} testID={`event-${e.id}-${p.id}`} />
                      ))}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.mute}>{status === 'open' ? 'No events.' : 'Offline'}</Text>
            )}
          </WidgetTile>
        ),
      },
      {
        id: 'profiles',
        row: 0,
        col: 3,
        accessibilityLabel: `Who's here: ${names}. Select to change`,
        onPress: onSwitchProfiles,
        render: () => (
          <WidgetTile label="Who's here">
            <View style={styles.avatars}>
              {here.map(p => (
                <View key={p.id} style={styles.avatarGap}>
                  <Avatar name={p.name} color={p.color} size={here.length > 3 ? 64 : 88} />
                </View>
              ))}
            </View>
          </WidgetTile>
        ),
      },
      {
        id: 'tonight',
        row: 1,
        col: 0,
        colSpan: 2,
        accessibilityLabel: tonight
          ? `Tonight: ${tonight.picks.map(p => p.title).join(', ')}. Select for more`
          : 'Tonight. Select to see picks for the people here',
        onPress: () => {
          setTonightOpen(true);
          onOpenWidget?.('tonight');
        },
        render: () => (
          <WidgetTile label={tonight && !tonightFresh ? 'Tonight · select for new picks' : 'Tonight'}>
            <View style={styles.posters}>
              {tonight
                ? tonight.picks.map((p, i) => (
                    <View key={`${p.title}-${i}`} style={[styles.poster, i > 0 && styles.posterGap]} testID={`tonight-tile-pick-${i}`}>
                      <Text style={styles.posterTitle} numberOfLines={2}>
                        {p.title}
                      </Text>
                    </View>
                  ))
                : TONIGHT_MOODS.map((m, i) => (
                    <View key={m.id} style={[styles.poster, i > 0 && styles.posterGap]}>
                      <Text style={styles.posterTitle}>{m.label}</Text>
                    </View>
                  ))}
            </View>
          </WidgetTile>
        ),
      },
      {
        id: 'sketch',
        row: 1,
        col: 2,
        accessibilityLabel: 'Sketch it. Draw on your phone. Everyone guesses on the TV',
        onPress: () => onOpenWidget?.('sketch'),
        render: () => (
          <WidgetTile label="Sketch it">
            <Text style={styles.big}>Draw on your phone.</Text>
          </WidgetTile>
        ),
      },
      {
        id: 'smart-home',
        row: 1,
        col: 3,
        accessibilityLabel: `Home. ${devices.map(d => `${d.name} ${deviceStateLabel(d)}`).join(', ') || 'Offline'}. Select to control`,
        onPress: () => {
          setSmartHomeOpen(true);
          onOpenWidget?.('smart-home');
        },
        render: () => (
          <WidgetTile label="Home">
            {devices.length ? (
              devices.map(d => (
                <View key={d.id} style={styles.deviceRow} testID={`device-${d.id}`}>
                  <Text style={styles.body}>{d.name}</Text>
                  <Text style={[styles.body, !deviceIsActive(d) && styles.muteText]}>{deviceStateLabel(d)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.mute}>Offline</Text>
            )}
          </WidgetTile>
        ),
      },
    ],
    [now, names, here, upcoming, profiles, devices, weather, status, tonight, tonightFresh, onOpenWidget, onSwitchProfiles],
  );

  const online = status === 'open';

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.greeting} testID="greeting">
          {greetingFor(now)}
        </Text>
        {!online ? (
          <View style={styles.pill} testID="status-pill" accessibilityLabel="The TV is offline">
            <View style={styles.dot} />
            <Text style={styles.pillText}>Offline</Text>
          </View>
        ) : null}
        <Button ref={connectRef} label="Connect phone" onPress={() => setConnectOpen(true)} testID="connect-phone" />
      </View>

      <TVFocusGuideView autoFocus style={styles.gridWrap}>
        <FocusGrid
          ref={gridRef}
          testID="home-grid"
          items={items}
          gap={space.md}
          initialFocusId="clock"
          focusScale={focus.scale}
          {...focusLook}
          radius={radius.md}
          cellStyle={styles.cell}
          focusedStyle={styles.cellFocused}
          onFocusChange={onFocusChange}
        />
      </TVFocusGuideView>

      {connectOpen ? <ConnectOverlay onClose={closeConnect} /> : null}
      {smartHomeOpen ? <SmartHomeOverlay onClose={closeSmartHome} /> : null}
      {tonightOpen ? <TonightOverlay onClose={closeTonight} /> : null}
    </View>
  );
}

/** "12° Cloudy", or '' before the first reading. */
export function weatherText(w: Weather | null): string {
  return w ? `${w.tempC}° ${weatherSummary(w.code)}` : '';
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
    alignItems: 'center',
    marginBottom: space.lg,
  },
  greeting: {
    flex: 1,
    color: colors.ink,
    fontSize: type.hero,
    fontWeight: '700',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: space.lg,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: space.xs,
    backgroundColor: colors.danger,
  },
  pillText: {
    color: colors.mute,
    fontSize: type.chip,
  },
  gridWrap: {
    flex: 1,
  },
  cell: {
    backgroundColor: colors.surface,
  },
  cellFocused: {
    backgroundColor: colors.surfaceRaised,
  },
  clock: {
    color: colors.ink,
    fontSize: 104,
    fontWeight: '700',
    lineHeight: 116,
  },
  big: {
    color: colors.ink,
    fontSize: type.title,
    fontWeight: '700',
  },
  body: {
    color: colors.ink,
    fontSize: type.body,
  },
  mute: {
    color: colors.mute,
    fontSize: type.body,
  },
  muteText: {
    color: colors.mute,
  },
  grow: {
    flex: 1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  eventTime: {
    color: colors.mute,
    fontSize: type.body,
    width: 160,
  },
  dots: {
    flexDirection: 'row',
    marginLeft: space.sm,
  },
  personDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: space.xs,
  },
  avatars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  avatarGap: {
    marginRight: space.sm,
    marginBottom: space.sm,
  },
  posters: {
    flex: 1,
    flexDirection: 'row',
  },
  poster: {
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    padding: space.sm,
    justifyContent: 'flex-end',
  },
  posterGap: {
    marginLeft: space.sm,
  },
  posterTitle: {
    color: colors.ink,
    fontSize: type.chip,
    fontWeight: '700',
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
});
