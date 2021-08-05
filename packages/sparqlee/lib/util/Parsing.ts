// TODO: Find a library for this

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
    if (value === 'INF') {
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

export interface ISplittedDate {
  year: string;
  month: string;
  day: string;
  hours: string;
  minutes: string;
  seconds: string;
  timezone: string;
}

/**
 * Parses ISO date or date time strings into it's parts.
 * I found no lib providing this functionality online, but it's needed heavily
 * by the spec (functions on dates), using any form of JS DateTime will lose the
 * original timezone notation.
 *
 * Example strings:
 *  - "2011-01-10T14:45:13.815-05:00"
 *  - "2011-01-10T14:45:13.815Z"
 *  - "2011-01-10T14:45:13Z"
 *  - "2011-01-10"
 * @param value the ISO date time string
 */
export function parseXSDDateTime(value: string): ISplittedDate {
  const posT = value.indexOf('T');
  const date = posT >= 0 ? value.slice(0, Math.max(0, posT)) : value;
  const [ year, month, day ] = date.split('-');
  let hours = '';
  let minutes = '';
  let seconds = '';
  let timezone = '';
  if (posT >= 0) {
    const timeAndTimeZone = value.slice(posT + 1);
    const [ time, _timeZoneChopped ] = timeAndTimeZone.split(/[+Z-]/u);
    [ hours, minutes, seconds ] = time.split(':');
    const timezoneOrNull = /([+Z-].*)/u.exec(timeAndTimeZone);
    timezone = timezoneOrNull ? timezoneOrNull[0] : '';
  } else {
    hours = '00';
    minutes = '00';
    seconds = '00';
    timezone = '';
  }
  return { year, month, day, hours, minutes, seconds, timezone };
}
