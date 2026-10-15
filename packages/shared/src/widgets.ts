/**
 * Pure helpers behind the home-screen widgets, shared by the TV, the phone
 * and the server so all three agree on what "upcoming" or "18–25 °C" means.
 */
import type {CalendarEvent, SmartDevice} from './protocol';

// --- Weather ---------------------------------------------------------------

/** WMO weather interpretation codes (Open-Meteo `weather_code`) → a short word. */
export function weatherSummary(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snow';
  if (code >= 95) return 'Thunderstorm';
  return 'Mixed';
}

// --- Calendar --------------------------------------------------------------

/** An event without an end counts as one hour long. */
const DEFAULT_EVENT_MS = 60 * 60 * 1000;

function endOf(e: CalendarEvent): number {
  return e.end ? Date.parse(e.end) : Date.parse(e.start) + DEFAULT_EVENT_MS;
}

/** Events that haven't ended yet, soonest first. */
export function upcomingEvents(events: readonly CalendarEvent[], now: Date, limit = Infinity): CalendarEvent[] {
  const t = now.getTime();
  return events
    .filter(e => endOf(e) > t)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .slice(0, limit);
}

/** Events sorted by start, with ones that ended over a day ago dropped. */
export function pruneEvents(events: readonly CalendarEvent[], now: number, max = 100): CalendarEvent[] {
  const cutoff = now - 24 * 60 * 60 * 1000;
  return events
    .filter(e => endOf(e) > cutoff)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .slice(0, max);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function clockTime(d: Date): string {
  const h = d.getHours() % 12 || 12;
  return `${h}:${d.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Short "when" for a widget row, in the viewer's local time:
 * today → "4:00", tomorrow → "Tomorrow", within a week → "Sat", later → "Oct 30".
 */
export function eventWhen(startIso: string, now: Date): string {
  const start = new Date(startIso);
  const days = Math.round((startOfDay(start) - startOfDay(now)) / 86_400_000);
  if (days === 0) return clockTime(start);
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 7) return DAYS[start.getDay()]!;
  return `${MONTHS[start.getMonth()]} ${start.getDate()}`;
}

// --- Smart home ------------------------------------------------------------

export const THERMOSTAT_RANGE = {min: 16, max: 28} as const;

/** Apply a `smart-home:set` to a device, clamping levels to what the device supports. */
export function applyDeviceSet(device: SmartDevice, change: {on?: boolean; level?: number}): SmartDevice {
  const next = {...device};
  if (change.on !== undefined && device.kind !== 'thermostat') next.on = change.on;
  if (change.level !== undefined) {
    if (device.kind === 'thermostat') {
      next.level = Math.min(THERMOSTAT_RANGE.max, Math.max(THERMOSTAT_RANGE.min, Math.round(change.level * 2) / 2));
    } else if (device.kind === 'light') {
      next.level = Math.min(100, Math.max(0, Math.round(change.level)));
    }
  }
  return next;
}

/** "On", "Off", "21°", "Locked", "Unlocked". */
export function deviceStateLabel(device: SmartDevice): string {
  switch (device.kind) {
    case 'thermostat':
      return `${device.level ?? '–'}°`;
    case 'lock':
      return device.on ? 'Locked' : 'Unlocked';
    default:
      return device.on ? 'On' : 'Off';
  }
}

/** Whether the TV draws the state in its "active" color (on, locked, or any thermostat). */
export function deviceIsActive(device: SmartDevice): boolean {
  if (device.kind === 'thermostat') return true;
  return Boolean(device.on);
}
