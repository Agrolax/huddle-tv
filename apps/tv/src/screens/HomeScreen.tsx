import React, {useCallback, useMemo, useRef, useState} from 'react';
import {findNodeHandle, StyleSheet, Text, View} from 'react-native';
import {FocusManager, TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {
  CalendarEvent,
  Profile,
  Weather,
  deviceIsActive,
  deviceStateLabel,
  eventWhen,
  upcomingEvents,
  weatherSummary,
} from '@huddle/shared';
import {FocusableCard, FocusGrid, FocusGridHandle, FocusGridItem} from '@huddle/tv-focus-kit';
import {ConnectOverlay} from '../components/ConnectOverlay';
import {SmartHomeOverlay} from '../components/SmartHomeOverlay';
import {WidgetTile} from '../components/WidgetTile';
import {namesFor} from '../data/profiles';
import {HouseholdActions, HouseholdState, useHousehold} from '../net/HouseholdContext';
import {formatDate, formatTime, greetingFor, useClock} from '../hooks/useClock';
import {colors, focus, radius, space, type} from '../theme';

export type WidgetId = 'clock' | 'calendar' | 'profiles' | 'tonight' | 'sketch' | 'smart-home';

type Props = {
  onSwitchProfiles: () => void;
  onOpenWidget?: (id: WidgetId) => void;
  onFocusChange?: (id: string) => void;
};

/**
 * Home: greeting band, then a 4×2 widget grid.
 *
 *   clock       | calendar (2 wide) | profiles
 *   tonight (2 wide)  | sketch      | smart home
 */
export function HomeScreen({onSwitchProfiles, onOpenWidget, onFocusChange}: Props) {
  const now = useClock();
  const household = useHousehold();
  const {activeProfileIds: profileIds, profiles, status, events, devices, weather} = household;
  const names = namesFor(profileIds, profiles);
  const here = useMemo(() => profiles.filter(p => profileIds.includes(p.id)), [profiles, profileIds]);
  const upcoming = useMemo(() => upcomingEvents(events, now, 3), [events, now]);
  const [connectOpen, setConnectOpen] = useState(false);
  const [smartHomeOpen, setSmartHomeOpen] = useState(false);
  const connectRef = useRef<View>(null);
  const gridRef = useRef<FocusGridHandle>(null);
  const weatherLine = weatherText(weather);

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

  const items = useMemo<FocusGridItem[]>(
    () => [
      {
        id: 'clock',
        row: 0,
        col: 0,
        accessibilityLabel: `Clock and weather, ${formatTime(now)}${weather ? `, ${weather.tempC} degrees, ${weatherSummary(weather.code)}` : ''}`,
        onPress: () => onOpenWidget?.('clock'),
        render: ({focused}) => (
          <WidgetTile label="Clock & weather" accent={colors.widget.clock} focused={focused}>
            <Text style={styles.clock}>{formatTime(now)}</Text>
            <Text style={styles.body}>{formatDate(now)}</Text>
            <Text style={styles.mute} numberOfLines={1} testID="weather-line">
              {weather ? `${weatherLine} · ${weather.place}` : 'Weather loading…'}
            </Text>
            {weather?.highC !== undefined && weather.lowC !== undefined ? (
              <Text style={styles.mute}>
                H {weather.highC}° · L {weather.lowC}°
              </Text>
            ) : null}
          </WidgetTile>
        ),
      },
      {
        id: 'calendar',
        row: 0,
        col: 1,
        colSpan: 2,
        accessibilityLabel: `Family calendar, ${upcoming.length ? upcoming.map(e => `${e.title} ${eventWhen(e.start, now)}`).join(', ') : 'nothing coming up'}`,
        onPress: () => onOpenWidget?.('calendar'),
        render: ({focused}) => (
          <WidgetTile
            label="Family calendar"
            accent={colors.widget.calendar}
            focused={focused}
            hint="Add events from your phone">
            {upcoming.length ? (
              upcoming.map(e => {
                const who = whoFor(e, profiles);
                return (
                  <View key={e.id} style={styles.eventRow} testID={`event-${e.id}`}>
                    <Text style={styles.eventTime}>{eventWhen(e.start, now)}</Text>
                    <Text style={[styles.body, styles.eventTitle]} numberOfLines={1}>
                      {e.title}
                      {who ? <Text style={styles.mute}> · {who}</Text> : null}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.mute}>{status === 'open' ? 'Nothing coming up.' : 'Calendar offline.'}</Text>
            )}
          </WidgetTile>
        ),
      },
      {
        id: 'profiles',
        row: 0,
        col: 3,
        accessibilityLabel: `Who's here: ${names}. Select to switch`,
        onPress: onSwitchProfiles,
        render: ({focused}) => (
          <WidgetTile label="Who's here" accent={colors.widget.profiles} focused={focused} hint="Select to switch">
            <View style={styles.avatars}>
              {here.map(p => (
                <View key={p.id} style={[styles.avatar, {backgroundColor: p.color}]}>
                  <Text style={styles.avatarLetter}>{p.name[0]}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.body} numberOfLines={2}>
              {names}
            </Text>
          </WidgetTile>
        ),
      },
      {
        id: 'tonight',
        row: 1,
        col: 0,
        colSpan: 2,
        accessibilityLabel: "Tonight picks. Select for picks made for who's here",
        onPress: () => onOpenWidget?.('tonight'),
        render: ({focused}) => (
          <WidgetTile
            label="Tonight"
            accent={colors.widget.tonight}
            focused={focused}
            hint="Select for picks made for who's here">
            <View style={styles.posters}>
              {['Cozy', 'Funny', 'Edge-of-seat'].map(mood => (
                <View key={mood} style={styles.poster}>
                  <Text style={styles.posterText}>{mood}</Text>
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
        accessibilityLabel: 'Sketch it game. Phones draw, everyone guesses',
        onPress: () => onOpenWidget?.('sketch'),
        render: ({focused}) => (
          <WidgetTile label="Sketch it" accent={colors.widget.sketch} focused={focused} hint="Select to start">
            <Text style={styles.title}>Draw on your phone.</Text>
            <Text style={styles.mute}>The room guesses on the TV.</Text>
          </WidgetTile>
        ),
      },
      {
        id: 'smart-home',
        row: 1,
        col: 3,
        accessibilityLabel: `Smart home, simulated. ${devices.map(d => `${d.name} ${deviceStateLabel(d)}`).join(', ') || 'offline'}. Select to control`,
        onPress: () => {
          setSmartHomeOpen(true);
          onOpenWidget?.('smart-home');
        },
        render: ({focused}) => (
          <WidgetTile label="Home" accent={colors.widget.smartHome} focused={focused} hint="Select to control">
            {devices.length ? (
              devices.map(d => (
                <View key={d.id} style={styles.deviceRow} testID={`device-${d.id}`}>
                  <Text style={styles.body}>{d.name}</Text>
                  <Text style={[styles.deviceState, deviceIsActive(d) && styles.deviceOn]}>{deviceStateLabel(d)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.mute}>Devices offline.</Text>
            )}
          </WidgetTile>
        ),
      },
    ],
    [now, names, here, upcoming, profiles, devices, weather, weatherLine, status, onOpenWidget, onSwitchProfiles],
  );

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.greeting}>
            {greetingFor(now)}, {names}
          </Text>
          <Text style={styles.sub} numberOfLines={1} testID="greeting-subline">
            {[nextUpText(upcoming[0], now), weatherLine, sublineFor(household)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <StatusPill status={status} phones={household.companions.filter(c => c.role === 'phone').length} />
        <FocusableCard
          ref={connectRef}
          onPress={() => setConnectOpen(true)}
          testID="connect-phone"
          accessibilityLabel="Connect a phone"
          ringColor={colors.focus}
          ringWidth={focus.borderWidth}
          radius={radius.pill}
          animationDuration={focus.duration}
          style={styles.chip}
          focusedStyle={styles.chipFocused}>
          <Text style={styles.chipText}>Connect phone</Text>
        </FocusableCard>
      </View>

      <TVFocusGuideView autoFocus style={styles.gridWrap}>
        <FocusGrid
          ref={gridRef}
          testID="home-grid"
          items={items}
          gap={space.lg}
          initialFocusId="clock"
          focusScale={focus.scale}
          ringColor={colors.focus}
          ringWidth={focus.borderWidth}
          radius={radius.lg}
          animationDuration={focus.duration}
          cellStyle={styles.cell}
          focusedStyle={styles.cellFocused}
          onFocusChange={onFocusChange}
        />
      </TVFocusGuideView>

      {connectOpen ? <ConnectOverlay onClose={closeConnect} /> : null}
      {smartHomeOpen ? <SmartHomeOverlay onClose={closeSmartHome} /> : null}
    </View>
  );
}

/** The part of the greeting line that talks about phones. */
export function sublineFor(h: Pick<HouseholdState, 'status' | 'latestMessage' | 'companions'> & Pick<HouseholdActions, 'senderName'>): string {
  if (h.latestMessage) return `${h.senderName(h.latestMessage)}: “${h.latestMessage.text}”`;
  if (h.status !== 'open') return 'phones offline';
  const phones = h.companions.filter(c => c.role === 'phone').length;
  if (phones === 0) return 'connect a phone to send messages';
  return `${phones} phone${phones > 1 ? 's' : ''} connected`;
}

function StatusPill({status, phones}: {status: HouseholdState['status']; phones: number}) {
  const online = status === 'open';
  const label = online ? (phones ? `${phones} phone${phones > 1 ? 's' : ''}` : 'Online') : status === 'failed' ? 'Offline' : 'Reconnecting';
  return (
    <View style={styles.pill} testID="status-pill" accessibilityLabel={`Server ${label}`}>
      <View style={[styles.dot, {backgroundColor: online ? colors.success : status === 'failed' ? colors.danger : colors.focus}]} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function restoreFocus(node: View | null): void {
  try {
    const handle = node && findNodeHandle(node);
    if (handle) FocusManager.focus(handle);
  } catch {
    // FocusManager is device-only.
  }
}

/** "12° cloudy", or '' before the first reading. */
export function weatherText(w: Weather | null): string {
  return w ? `${w.tempC}° ${weatherSummary(w.code).toLowerCase()}` : '';
}

/** "Pizza night at 7:00" for today, "Dentist Tmrw" otherwise. */
function nextUpText(e: CalendarEvent | undefined, now: Date): string {
  if (!e) return '';
  const when = eventWhen(e.start, now);
  return /\d:\d\d/.test(when) ? `${e.title} at ${when}` : `${e.title} ${when}`;
}

/** Names of the people an event is for; '' means the whole family. */
function whoFor(e: CalendarEvent, profiles: Profile[]): string {
  return profiles
    .filter(p => e.profileIds.includes(p.id))
    .map(p => p.name)
    .join(', ');
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
  heroText: {
    flex: 1,
    marginRight: space.lg,
  },
  greeting: {
    color: colors.ink,
    fontSize: type.hero,
    fontWeight: '700',
  },
  sub: {
    color: colors.mute,
    fontSize: type.body,
    marginTop: space.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: space.md,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: space.xs,
  },
  pillText: {
    color: colors.mute,
    fontSize: type.chip,
  },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  chipFocused: {
    backgroundColor: colors.surfaceRaised,
  },
  chipText: {
    color: colors.ink,
    fontSize: type.caption,
    fontWeight: '700',
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
    fontSize: 88,
    fontWeight: '700',
    lineHeight: 96,
  },
  title: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: '700',
    marginBottom: space.xs,
  },
  body: {
    color: colors.ink,
    fontSize: type.body,
  },
  mute: {
    color: colors.mute,
    fontSize: type.body,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: space.sm,
  },
  eventTime: {
    color: colors.widget.calendar,
    fontSize: type.body,
    fontWeight: '700',
    width: 120,
  },
  eventTitle: {
    flex: 1,
  },
  avatars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: space.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.xs,
    marginBottom: space.xs,
  },
  avatarLetter: {
    color: colors.bg,
    fontSize: type.body,
    fontWeight: '700',
  },
  posters: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: space.sm,
  },
  poster: {
    flex: 1,
    marginRight: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.board,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterText: {
    color: colors.mute,
    fontSize: type.caption,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  deviceState: {
    color: colors.mute,
    fontSize: type.body,
    fontWeight: '700',
  },
  deviceOn: {
    color: colors.success,
  },
});
