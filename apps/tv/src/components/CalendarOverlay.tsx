import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {CalendarEvent, Profile, clockTime, eventWhen, tonightEvents, upcomingEvents, weekDays} from '@huddle/shared';
import {useHousehold} from '../net/HouseholdContext';
import {useClock} from '../hooks/useClock';
import {colors, radius, space, type} from '../theme';
import {Avatar, Button, Sheet} from './ui';

type Props = {onClose: () => void};

/** "Maya & Leo", or "Everyone" for a family event. */
export function whoFor(e: CalendarEvent, profiles: Profile[]): string {
  const names = profiles.filter(p => e.profileIds.includes(p.id)).map(p => p.name);
  if (!names.length) return 'Everyone';
  return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/**
 * The week on one screen: what's next and what's on tonight up top, then a
 * column per day. Read-only on the TV; phones add and remove events.
 */
export function CalendarOverlay({onClose}: Props) {
  const {events, profiles, tonight} = useHousehold();
  const now = useClock();
  const live = upcomingEvents(events, now);
  const next = live[0];
  const evening = tonightEvents(events, now);
  const days = weekDays(live, now);

  return (
    <Sheet testID="calendar-overlay" title="This week" subtitle="Add events from your phone." onClose={onClose} width={1728}>
      <View style={styles.summary}>
        <View style={styles.summaryCard} testID="calendar-next">
          <Text style={styles.summaryLabel}>Next up</Text>
          {next ? (
            <>
              <Text style={styles.summaryTitle} numberOfLines={1}>
                {next.title}
              </Text>
              <Text style={styles.summaryBody}>
                {eventWhen(next.start, now)}
                {/\d:\d\d/.test(eventWhen(next.start, now)) ? '' : ` · ${clockTime(new Date(next.start))}`} · {whoFor(next, profiles)}
              </Text>
            </>
          ) : (
            <Text style={styles.summaryBody}>Nothing planned.</Text>
          )}
        </View>
        <View style={[styles.summaryCard, styles.summaryGap]} testID="calendar-tonight">
          <Text style={styles.summaryLabel}>Tonight</Text>
          {evening.length ? (
            evening.slice(0, 2).map(e => (
              <Text key={e.id} style={styles.summaryBody} numberOfLines={1}>
                {clockTime(new Date(e.start))} {e.title} · {whoFor(e, profiles)}
              </Text>
            ))
          ) : (
            <Text style={styles.summaryBody}>Nothing on. Free for a movie.</Text>
          )}
          {tonight?.endsBy ? (
            <Text style={styles.summaryAccent} numberOfLines={1}>
              Movie ends by {tonight.endsBy.label} ({tonight.endsBy.reason})
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.week}>
        {days.map((d, i) => (
          <View key={d.start} style={[styles.day, i > 0 && styles.dayGap]} testID={`calendar-day-${i}`}>
            <View style={styles.dayHead}>
              <Text style={[styles.dayName, d.today && styles.todayText]}>{d.today ? 'Today' : d.name}</Text>
              <View style={[styles.dateBadge, d.today && styles.todayBadge]}>
                <Text style={styles.dateText}>{d.date}</Text>
              </View>
            </View>
            {d.events.slice(0, 4).map(e => {
              const people = profiles.filter(p => e.profileIds.includes(p.id));
              return (
                <View key={e.id} style={[styles.event, {borderLeftColor: people[0]?.color ?? colors.mute}]} testID={`calendar-event-${e.id}`}>
                  <Text style={styles.eventTime}>{clockTime(new Date(e.start))}</Text>
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {e.title}
                  </Text>
                  <View style={styles.eventPeople}>
                    {people.length ? people.map(p => <Avatar key={p.id} profile={p} size={36} />) : <Text style={styles.everyone}>Everyone</Text>}
                  </View>
                </View>
              );
            })}
            {d.events.length > 4 ? <Text style={styles.more}>+{d.events.length - 4} more</Text> : null}
          </View>
        ))}
      </View>

      <Button testID="calendar-done" label="Done" preferred onPress={onClose} containerStyle={styles.done} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    marginTop: space.lg,
  },
  summaryCard: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    padding: space.md,
  },
  summaryGap: {
    marginLeft: space.md,
  },
  summaryLabel: {
    color: colors.mute,
    fontSize: type.chip,
    fontWeight: '500',
  },
  summaryTitle: {
    color: colors.ink,
    fontSize: type.title,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryBody: {
    color: colors.ink,
    fontSize: type.body,
    marginTop: 4,
  },
  summaryAccent: {
    color: colors.accent,
    fontSize: type.body,
    fontWeight: '700',
    marginTop: space.xs,
  },
  week: {
    flexDirection: 'row',
    marginTop: space.lg,
    minHeight: 420,
  },
  day: {
    flex: 1,
  },
  dayGap: {
    marginLeft: space.sm,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  dayName: {
    color: colors.mute,
    fontSize: type.chip,
    fontWeight: '700',
  },
  todayText: {
    color: colors.ink,
  },
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: {
    backgroundColor: colors.accent,
  },
  dateText: {
    color: colors.ink,
    fontSize: type.chip,
    fontWeight: '700',
  },
  event: {
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderLeftWidth: 8,
    padding: space.sm,
    marginBottom: space.sm,
  },
  eventTime: {
    color: colors.mute,
    fontSize: type.caption,
  },
  eventTitle: {
    color: colors.ink,
    fontSize: type.caption,
    fontWeight: '700',
    marginTop: 2,
  },
  eventPeople: {
    flexDirection: 'row',
    marginTop: space.xs,
    minHeight: 36,
    alignItems: 'center',
  },
  everyone: {
    color: colors.mute,
    fontSize: type.caption,
  },
  more: {
    color: colors.mute,
    fontSize: type.caption,
  },
  done: {
    alignSelf: 'flex-start',
    marginTop: space.md,
  },
});
