import { DateTime } from 'luxon';

let defaultTimezone = 'UTC';

export function setDefaultTimezone(tz) {
    if (tz && typeof tz === 'string') defaultTimezone = tz;
}

export function getDefaultTimezone() {
    return defaultTimezone;
}

// Parse ISO date string to Luxon DateTime (with optional timezone)
export function parseISO(dateStr, timezone = defaultTimezone) {
    return DateTime.fromISO(dateStr, { zone: timezone });
}

// Format DateTime to ISO string (with optional timezone)
export function formatISO(date, timezone = defaultTimezone) {
    return DateTime.fromJSDate(date, { zone: timezone }).toISO();
}

// Format date to readable string in preferred timezone
export function formatInTimezone(date, timezone = defaultTimezone, format = "yyyy-MM-dd HH:mm") {
    return DateTime.fromJSDate(date, { zone: timezone }).toFormat(format);
}

// Get start of day for a given date (as DateTime)
export function startOfDay(date, timezone = 'UTC') {
    return DateTime.fromJSDate(date, { zone: timezone }).startOf('day');
}

// Get end of day for a given date (as DateTime)
export function endOfDay(date, timezone = 'UTC') {
    return DateTime.fromJSDate(date, { zone: timezone }).endOf('day');
}

// Add minutes to a date
export function addMinutes(date, minutes, timezone = 'UTC') {
    return DateTime.fromJSDate(date, { zone: timezone }).plus({ minutes }).toJSDate();
}

// Check if two intervals overlap
export function intervalsOverlap(startA, endA, startB, endB, timezone = 'UTC') {
    const aStart = DateTime.fromISO(startA, { zone: timezone });
    const aEnd = DateTime.fromISO(endA, { zone: timezone });
    const bStart = DateTime.fromISO(startB, { zone: timezone });
    const bEnd = DateTime.fromISO(endB, { zone: timezone });
    return aStart < bEnd && aEnd > bStart;
}

// Get difference in minutes between two dates
export function diffInMinutes(dateA, dateB, timezone = 'UTC') {
    const a = DateTime.fromJSDate(dateA, { zone: timezone });
    const b = DateTime.fromJSDate(dateB, { zone: timezone });
    return Math.round(a.diff(b, 'minutes').minutes);
}

// Get human readable relative time (e.g., "in 2 hours")
export function humanizeRelative(date, base = new Date(), timezone = 'UTC') {
    const dt = DateTime.fromJSDate(date, { zone: timezone });
    const baseDt = DateTime.fromJSDate(base, { zone: timezone });
    return dt.toRelative({ base: baseDt });
}

