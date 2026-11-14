import type {
  GeneralSuperTypeDict,
  IDateRepresentation,
  IDateTimeRepresentation,
  IDayTimeDurationRepresentation,
  IDurationRepresentation,
  ITimeRepresentation,
  ITimeZoneRepresentation,
  IYearMonthDurationRepresentation,
} from '@comunica/types';
import { TypeURL } from './Consts';
import { simplifyDurationRepresentation } from './DateTimeHelpers';
import { ParseError } from './Errors';
import { maximumDayInMonthFor } from './SpecAlgos';

// Lexical spaces of the numeric XSD datatypes, allowing surrounding whitespace
const LEXICAL_INTEGER = /^[\t\n\r ]*[+-]?\d+[\t\n\r ]*$/u;
const LEXICAL_DECIMAL = /^[\t\n\r ]*[+-]?(?:\d+(?:\.\d*)?|\.\d+)[\t\n\r ]*$/u;
const LEXICAL_FLOAT = /^[\t\n\r ]*(?:[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?|[+-]?INF|NaN)[\t\n\r ]*$/u;

// Value ranges of the integer datatypes derived from xsd:integer
const INTEGER_RANGES: [string, bigint | number, bigint | number][] = [
  [ TypeURL.XSD_NON_POSITIVE_INTEGER, Number.NEGATIVE_INFINITY, 0n ],
  [ TypeURL.XSD_NEGATIVE_INTEGER, Number.NEGATIVE_INFINITY, -1n ],
  [ TypeURL.XSD_LONG, -9_223_372_036_854_775_808n, 9_223_372_036_854_775_807n ],
  [ TypeURL.XSD_INT, -2_147_483_648n, 2_147_483_647n ],
  [ TypeURL.XSD_SHORT, -32_768n, 32_767n ],
  [ TypeURL.XSD_BYTE, -128n, 127n ],
  [ TypeURL.XSD_NON_NEGATIVE_INTEGER, 0n, Number.POSITIVE_INFINITY ],
  [ TypeURL.XSD_POSITIVE_INTEGER, 1n, Number.POSITIVE_INFINITY ],
  [ TypeURL.XSD_UNSIGNED_LONG, 0n, 18_446_744_073_709_551_615n ],
  [ TypeURL.XSD_UNSIGNED_INT, 0n, 4_294_967_295n ],
  [ TypeURL.XSD_UNSIGNED_SHORT, 0n, 65_535n ],
  [ TypeURL.XSD_UNSIGNED_BYTE, 0n, 255n ],
];

/**
 * Check if a lexical form is valid for a numeric datatype:
 * it must be in the lexical space of the datatype, and its value must be in the range of the datatype.
 * @param value The lexical form.
 * @param superTypeDict The super types of the datatype, which must include xsd:decimal, xsd:float, or xsd:double.
 */
export function isValidXSDNumeric(value: string, superTypeDict: GeneralSuperTypeDict): boolean {
  if (TypeURL.XSD_INTEGER in superTypeDict) {
    if (!LEXICAL_INTEGER.test(value)) {
      return false;
    }
    let bigValue: bigint | undefined;
    for (const [ type, min, max ] of INTEGER_RANGES) {
      if (type in superTypeDict) {
        bigValue ??= BigInt(value);
        if (bigValue < min || bigValue > max) {
          return false;
        }
      }
    }
    return true;
  }
  if (TypeURL.XSD_DECIMAL in superTypeDict) {
    return LEXICAL_DECIMAL.test(value);
  }
  return LEXICAL_FLOAT.test(value);
}

/**
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

export function parseDateTime(dateTimeStr: string): IDateTimeRepresentation {
  // https://www.w3.org/TR/xmlschema-2/#dateTime
  const [ date, time ] = dateTimeStr.split('T');
  if (time === undefined) {
    throw new ParseError(dateTimeStr, 'dateTime');
  }
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
  const timeZoneStrings = timeZoneStr.replaceAll(/^([+|-])(\d\d):(\d\d)$/gu, '$11!$2!$3').split('!');
  const timeZone = timeZoneStrings.map(Number);
  return {
    zoneHours: timeZone[0] * timeZone[1],
    zoneMinutes: timeZone[0] * timeZone[2],
  };
}

export function parseDate(dateStr: string): IDateRepresentation {
  // https://www.w3.org/TR/xmlschema-2/#date-lexical-representation
  const formatted = dateStr.replaceAll(
    /^(-)?([123456789]*\d{4})-(\d\d)-(\d\d)(Z|([+-]\d\d:\d\d))?$/gu,
    '$11!$2!$3!$4!$5',
  );
  if (formatted === dateStr) {
    throw new ParseError(dateStr, 'date');
  }
  const dateStrings = formatted.split('!');
  const date = dateStrings.slice(0, -1).map(Number);

  const res = {
    year: date[0] * date[1],
    month: date[2],
    day: date[3],
    ...parseTimeZone(dateStrings[4]),
  };
  if (!(res.month >= 1 && res.month <= 12) || !(res.day >= 1 && res.day <= maximumDayInMonthFor(res.year, res.month))) {
    throw new ParseError(dateStr, 'date');
  }
  return res;
}

function __parseTime(timeStr: string): ITimeRepresentation {
  // https://www.w3.org/TR/xmlschema-2/#time-lexical-repr
  const formatted = timeStr.replaceAll(/^(\d\d):(\d\d):(\d\d(\.\d+)?)(Z|([+-]\d\d:\d\d))?$/gu, '$1!$2!$3!$5');
  if (formatted === timeStr) {
    throw new ParseError(timeStr, 'time');
  }
  const timeStrings = formatted.split('!');
  const time = timeStrings.slice(0, -1).map(Number);

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
  const formattedDayDur = dayNotation.replaceAll(/^(-)?P(\d+Y)?(\d+M)?(\d+D)?$/gu, '$11S!$2!$3!$4');
  if (formattedDayDur === dayNotation) {
    throw new ParseError(durationStr, 'duration');
  }

  const durationStrings = formattedDayDur.split('!');
  if (timeNotation !== undefined) {
    const formattedTimeDur = timeNotation.replaceAll(/^(\d+H)?(\d+M)?(\d+(\.\d+)?S)?$/gu, '$1!$2!$3');

    if (timeNotation === '' || timeNotation === formattedTimeDur) {
      throw new ParseError(durationStr, 'duration');
    }
    durationStrings.push(...formattedTimeDur.split('!'));
  }
  const duration = durationStrings.map(str => str.slice(0, -1));
  if (!duration.slice(1).some(Boolean)) {
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
  if ([ 'hours', 'minutes', 'seconds', 'day' ].some(key => Boolean((<any> res)[key]))) {
    throw new ParseError(durationStr, 'yearMonthDuration');
  }
  return res;
}

export function parseDayTimeDuration(durationStr: string): Partial<IDayTimeDurationRepresentation> {
  const res = parseDuration(durationStr);
  if ([ 'year', 'month' ].some(key => Boolean((<any> res)[key]))) {
    throw new ParseError(durationStr, 'dayTimeDuration');
  }
  return res;
}
