// TODO: Find a library for this, because this is basically an xsd datatypes parser

import type {
  IDateRepresentation,
  IDateTimeRepresentation, IDayTimeDurationRepresentation, IDurationRepresentation,
  ITimeRepresentation,
  ITimeZoneRepresentation, IYearMonthDurationRepresentation,
} from './DateTimeHelpers';

import { simplifyDurationRepresentation } from './DateTimeHelpers';
import { ParseError } from './Errors';
import { maximumDayInMonthFor } from './SpecAlgos';

/**
 * TODO: Fix decently
 * Parses float datatypes (double, float).
 *
 * All invalid lexical values return undefined.
 *
 * @param value the string to interpret as a number
 */
export function parseXSDFloat(value: string): number | undefined {
  const numb = Number(value);
  if (Number.isNaN(numb)) {
    if (value === 'NaN') {
      return Number.NaN;
    }
    if (value === 'INF' || value === '+INF') {
      return Number.POSITIVE_INFINITY;
    }
    if (value === '-INF') {
      return Number.NEGATIVE_INFINITY;
    }
    return undefined;
  }
  return numb;
}

/**
 * Parses decimal datatypes (decimal, int, byte, nonPositiveInteger, etc...).
 *
 * All other values, including NaN, INF, and floating point numbers all
 * return undefined;
 *
 * @param value the string to interpret as a number
 */
export function parseXSDDecimal(value: string): number | undefined {
  const numb = Number(value);
  return Number.isNaN(numb) ? undefined : numb;
}

/**
 * Parses integer datatypes (decimal, int, byte, nonPositiveInteger, etc...).
 *
 * All other values, including NaN, INF, and floating point numbers all
 * return undefined;
 *
 * @param value the string to interpret as a number
 */
export function parseXSDInteger(value: string): number | undefined {
  const numb: number = Number.parseInt(value, 10);
  return Number.isNaN(numb) ? undefined : numb;
}

export function parseDateTime(dateTimeStr: string): IDateTimeRepresentation {
  // https://www.w3.org/TR/xmlschema-2/#dateTime
  const [ date, time ] = dateTimeStr.split('T');
  return { ...parseDate(date), ...__parseTime(time) };
}

function parseTimeZone(timeZoneStr: string): Partial<ITimeZoneRepresentation> {
  // https://www.w3.org/TR/xmlschema-2/#dateTime-timezones
  if (timeZoneStr === '') {
    return { zoneHours: undefined, zoneMinutes: undefined };
  }
  if (timeZoneStr === 'Z') {
    return { zoneHours: 0, zoneMinutes: 0 };
  }
  const timeZoneStrings = timeZoneStr.replace(/^([+|-])(\d\d):(\d\d)$/gu, '$11!$2!$3').split('!');
  const timeZone = timeZoneStrings.map(str => Number(str));
  return {
    zoneHours: timeZone[0] * timeZone[1],
    zoneMinutes: timeZone[0] * timeZone[2],
  };
}

export function parseDate(dateStr: string): IDateRepresentation {
  // https://www.w3.org/TR/xmlschema-2/#date-lexical-representation
  const formatted = dateStr.replace(
    /^(-)?([123456789]*\d{4})-(\d\d)-(\d\d)(Z|([+-]\d\d:\d\d))?$/gu, '$11!$2!$3!$4!$5',
  );
  if (formatted === dateStr) {
    throw new ParseError(dateStr, 'date');
  }
  const dateStrings = formatted.split('!');
  const date = dateStrings.slice(0, -1).map(str => Number(str));

  const res = {
    year: date[0] * date[1],
    month: date[2],
    day: date[3],
    ...parseTimeZone(dateStrings[4]),
  };
  if (!(1 <= res.month && res.month <= 12) || !(1 <= res.day && res.day <= maximumDayInMonthFor(res.year, res.month))) {
    throw new ParseError(dateStr, 'date');
  }
  return res;
}

function __parseTime(timeStr: string): ITimeRepresentation {
  // https://www.w3.org/TR/xmlschema-2/#time-lexical-repr
  const formatted = timeStr.replace(/^(\d\d):(\d\d):(\d\d(\.\d+)?)(Z|([+-]\d\d:\d\d))?$/gu, '$1!$2!$3!$5');
  if (formatted === timeStr) {
    throw new ParseError(timeStr, 'time');
  }
  const timeStrings = formatted.split('!');
  const time = timeStrings.slice(0, -1).map(str => Number(str));

  const res = {
    hours: time[0],
    minutes: time[1],
    seconds: time[2],
    ...parseTimeZone(timeStrings[3]),
  };

  if (res.seconds >= 60 || res.minutes >= 60 || res.hours > 24 ||
    (res.hours === 24 && (res.minutes !== 0 || res.seconds !== 0))) {
    throw new ParseError(timeStr, 'time');
  }
  return res;
}

// We make a separation in internal and external since dateTime will have hour-date rollover,
// but time just does modulo the time.
export function parseTime(timeStr: string): ITimeRepresentation {
  // https://www.w3.org/TR/xmlschema-2/#time-lexical-repr
  const res = __parseTime(timeStr);
  res.hours %= 24;
  return res;
}

export function parseDuration(durationStr: string): Partial<IDurationRepresentation> {
  // https://www.w3.org/TR/xmlschema-2/#duration-lexical-repr
  const [ dayNotation, timeNotation ] = durationStr.split('T');

  // Handle date part
  const formattedDayDur = dayNotation.replace(/^(-)?P(\d+Y)?(\d+M)?(\d+D)?$/gu, '$11S!$2!$3!$4');
  if (formattedDayDur === dayNotation) {
    throw new ParseError(durationStr, 'duration');
  }

  const durationStrings = formattedDayDur.split('!');
  if (timeNotation !== undefined) {
    const formattedTimeDur = timeNotation.replace(/^(\d+H)?(\d+M)?(\d+(\.\d+)?S)?$/gu, '$1!$2!$3');

    if (timeNotation === '' || timeNotation === formattedTimeDur) {
      throw new ParseError(durationStr, 'duration');
    }
    durationStrings.push(...formattedTimeDur.split('!'));
  }
  const duration = durationStrings.map(str => str.slice(0, -1));
  if (!duration.slice(1).some(item => item)) {
    throw new ParseError(durationStr, 'duration');
  }

  const sign = <-1 | 1> Number(duration[0]);
  return simplifyDurationRepresentation({
    year: duration[1] ? sign * Number(duration[1]) : undefined,
    month: duration[2] ? sign * Number(duration[2]) : undefined,
    day: duration[3] ? sign * Number(duration[3]) : undefined,
    hours: duration[4] ? sign * Number(duration[4]) : undefined,
    minutes: duration[5] ? sign * Number(duration[5]) : undefined,
    seconds: duration[6] ? sign * Number(duration[6]) : undefined,
  });
}

export function parseYearMonthDuration(durationStr: string): Partial<IYearMonthDurationRepresentation> {
  const res = parseDuration(durationStr);
  // @ts-expect-error: The usage of any is okey here since we just check whether something is there.
  if ([ 'hours', 'minutes', 'seconds', 'day' ].some(key => Boolean(res[key]))) {
    throw new ParseError(durationStr, 'yearMonthDuration');
  }
  return res;
}

export function parseDayTimeDuration(durationStr: string): Partial<IDayTimeDurationRepresentation> {
  const res = parseDuration(durationStr);
  // @ts-expect-error: The usage of any is okey here since we just check whether something is there.
  if ([ 'year', 'month' ].some(key => Boolean(res[key]))) {
    throw new ParseError(durationStr, 'dayTimeDuration');
  }
  return res;
}

