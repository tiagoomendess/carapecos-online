const timeZone = 'Europe/Lisbon';
const locale = 'pt-PT';

const longDate = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone });
const dateTime = new Intl.DateTimeFormat(locale, {
	dateStyle: 'long',
	timeStyle: 'short',
	timeZone
});
const shortDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone });
const shortDateYear = new Intl.DateTimeFormat(locale, {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone
});
const year = new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone });
const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

const hour = 60 * 60 * 1000;

/** "26 de outubro de 2026" */
export const formatDate = (date: Date) => longDate.format(date);

/** "26 de outubro de 2026, 10:34" */
export const formatDateTime = (date: Date) => dateTime.format(date);

/** Compact date for listings: "há 3 horas" today, "26/10" style this year, with the year before that */
export function formatListDate(date: Date, now = new Date()) {
	const age = now.getTime() - date.getTime();
	if (age >= 0 && age < hour)
		return relative.format(-Math.max(1, Math.round(age / 60_000)), 'minute');
	if (age >= 0 && age < 24 * hour) return relative.format(-Math.round(age / hour), 'hour');
	return year.format(date) === year.format(now)
		? shortDate.format(date)
		: shortDateYear.format(date);
}

/** YYYY-MM-DD in Lisbon time, for daily counters */
export const lisbonDay = (date = new Date()) =>
	new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);

const wallClockParts = new Intl.DateTimeFormat('en-GB', {
	timeZone,
	hourCycle: 'h23',
	year: 'numeric',
	month: 'numeric',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric',
	second: 'numeric'
});

/** Lisbon's wall clock at `date`, as if it were UTC (so the UTC getters read Lisbon time) */
function lisbonWallClock(date: Date) {
	const parts = Object.fromEntries(
		wallClockParts.formatToParts(date).map((p) => [p.type, Number(p.value)])
	);
	return new Date(
		Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
	);
}

/**
 * The moment Lisbon's clock showed this wall-clock time (given as UTC fields).
 * Lisbon is UTC+0 in winter and UTC+1 in summer; the offset is taken at that moment.
 */
export function fromLisbonWallClock(wallClock: Date) {
	const offset = lisbonWallClock(wallClock).getTime() - wallClock.getTime();
	return new Date(wallClock.getTime() - offset);
}

/** Value for an `<input type="datetime-local">` showing Lisbon time: "2026-10-27T09:30" */
export const toLisbonInput = (date: Date) => lisbonWallClock(date).toISOString().slice(0, 16);

/** Parses a `datetime-local` value as Lisbon time. Returns `null` if it isn't one. */
export function fromLisbonInput(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
	const wallClock = new Date(`${value}:00Z`);
	return Number.isNaN(wallClock.getTime()) ? null : fromLisbonWallClock(wallClock);
}
