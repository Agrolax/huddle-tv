import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {FocusableCard, FocusGrid, FocusGridItem} from '@huddle/tv-focus-kit';
import {WidgetTile} from '../components/WidgetTile';
import {PROFILES, namesFor} from '../data/profiles';
import {formatDate, formatTime, greetingFor, useClock} from '../hooks/useClock';
import {colors, focus, radius, space, type} from '../theme';

export type WidgetId = 'clock' | 'calendar' | 'profiles' | 'tonight' | 'sketch' | 'smart-home';

type Props = {
  profileIds: string[];
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
export function HomeScreen({profileIds, onSwitchProfiles, onOpenWidget, onFocusChange}: Props) {
  const now = useClock();
  const names = namesFor(profileIds);
  const here = useMemo(() => PROFILES.filter(p => profileIds.includes(p.id)), [profileIds]);

  const items = useMemo<FocusGridItem[]>(
    () => [
      {
        id: 'clock',
        row: 0,
        col: 0,
        accessibilityLabel: `Clock and weather, ${formatTime(now)}, 14 degrees and clear`,
        onPress: () => onOpenWidget?.('clock'),
        render: ({focused}) => (
          <WidgetTile label="Clock & weather" accent={colors.widget.clock} focused={focused}>
            <Text style={styles.clock}>{formatTime(now)}</Text>
            <Text style={styles.body}>{formatDate(now)}</Text>
            <Text style={styles.mute}>14° clear · Toronto</Text>
          </WidgetTile>
        ),
      },
      {
        id: 'calendar',
        row: 0,
        col: 1,
        colSpan: 2,
        accessibilityLabel: 'Family calendar, 3 events coming up',
        onPress: () => onOpenWidget?.('calendar'),
        render: ({focused}) => (
          <WidgetTile
            label="Family calendar"
            accent={colors.widget.calendar}
            focused={focused}
            hint="Add events from your phone">
            {CALENDAR.map(e => (
              <View key={e.time + e.title} style={styles.eventRow}>
                <Text style={styles.eventTime}>{e.time}</Text>
                <Text style={styles.body} numberOfLines={1}>
                  {e.title}
                </Text>
                {e.who ? <Text style={styles.mute}> · {e.who}</Text> : null}
              </View>
            ))}
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
        accessibilityLabel: 'Smart home, simulated. Lamp on, thermostat 21 degrees, front door locked',
        onPress: () => onOpenWidget?.('smart-home'),
        render: ({focused}) => (
          <WidgetTile label="Home" accent={colors.widget.smartHome} focused={focused} hint="Simulated devices">
            {DEVICES.map(d => (
              <View key={d.name} style={styles.deviceRow}>
                <Text style={styles.body}>{d.name}</Text>
                <Text style={[styles.deviceState, d.on && styles.deviceOn]}>{d.state}</Text>
              </View>
            ))}
          </WidgetTile>
        ),
      },
    ],
    [now, names, here, onOpenWidget, onSwitchProfiles],
  );

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.greeting}>
            {greetingFor(now)}, {names}
          </Text>
          <Text style={styles.sub}>Dinner at 7 · 14° and clear · nothing new from phones</Text>
        </View>
        <FocusableCard
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
    </View>
  );
}

const CALENDAR = [
  {time: '4:00', title: 'Dentist', who: 'Ammu'},
  {time: '7:00', title: 'Pizza night', who: ''},
  {time: 'Sat', title: 'Soccer practice', who: 'Rafi'},
];

const DEVICES = [
  {name: 'Lamp', state: 'On', on: true},
  {name: 'Thermostat', state: '21°', on: true},
  {name: 'Front door', state: 'Locked', on: false},
];

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
    width: 96,
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
