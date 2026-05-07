import type {
  IDateRepresentation,
  IDateTimeRepresentation,
  IDurationRepresentation,
  ITimeRepresentation,
  ITimeZoneRepresentation,
} from '@comunica/types';

function numSerializer(num: number, min = 2): string {
  return num.toLocaleString(undefined, { minimumIntegerDigits: min, useGrouping: false });
}

/**
 * Serializes a dateTime representation to its canonical XSD string form.
 * @param date The dateTime representation to serialize.
 * @return The canonical dateTime string.
 */
export function serializeDateTime(date: IDateTimeRepresentation): string {
  // https://www.w3.org/TR/xmlschema-2/#dateTime
  // Extraction is needed because the date serializer can not add timezone y
  return `${serializeDate({ year: date.year, month: date.month, day: date.day })}T${serializeTime(date)}`;
}

function serializeTimeZone(tz: Partial<ITimeZoneRepresentation>): string {
  // https://www.w3.org/TR/xmlschema-2/#dateTime-timezones
  if (tz.zoneHours === undefined || tz.zoneMinutes === undefined) {
    return '';
  }
  if (tz.zoneHours === 0 && tz.zoneMinutes === 0) {
    return 'Z';
  }
  // SerializeTimeZone({ zoneHours: 5, zoneMinutes: 4 }) returns +05:04
  return `${tz.zoneHours >= 0 ? `+${numSerializer(tz.zoneHours)}` : numSerializer(tz.zoneHours)}:${numSerializer(Math.abs(tz.zoneMinutes))}`;
}

/**
 * Serializes a date representation to its canonical XSD string form.
 * @param date The date representation to serialize.
 * @return The canonical date string.
 */
export function serializeDate(date: IDateRepresentation): string {
  // https://www.w3.org/TR/xmlschema-2/#date-lexical-representation
  return `${numSerializer(date.year, 4)}-${numSerializer(date.month)}-${numSerializer(date.day)}${serializeTimeZone(date)}`;
}

/**
 * Serializes a time representation to its canonical XSD string form.
 * @param time The time representation to serialize.
 * @return The canonical time string.
 */
export function serializeTime(time: ITimeRepresentation): string {
  // https://www.w3.org/TR/xmlschema-2/#time-lexical-repr
  return `${numSerializer(time.hours)}:${numSerializer(time.minutes)}:${numSerializer(time.seconds)}${serializeTimeZone(time)}`;
}

/**
 * Serializes a duration representation to its canonical XSD string form.
 * @param dur The partial duration representation to serialize.
 * @param zeroString Optional default string for a zero-duration.
 * @return The canonical duration string.
 */
export function serializeDuration(dur: Partial<IDurationRepresentation>, zeroString: 'PT0S' | 'P0M' = 'PT0S'): string {
  // https://www.w3.org/TR/xmlschema-2/#duration-lexical-repr
  if (!Object.values(dur).some(val => (val || 0) !== 0)) {
    return zeroString;
  }

  const sign = Object.values(dur).some(val => (val || 0) < 0) ? '-' : '';
  const year = dur.year ? `${Math.abs(dur.year)}Y` : '';
  const month = dur.month ? `${Math.abs(dur.month)}M` : '';
  const day = dur.day ? `${Math.abs(dur.day)}D` : '';

  const dayNotation = `${sign}P${year}${month}${day}`;
  // eslint-disable-next-line ts/prefer-nullish-coalescing
  if (!(dur.hours || dur.minutes || dur.seconds)) {
    return dayNotation;
  }

  const hour = dur.hours ? `${Math.abs(dur.hours)}H` : '';
  const minute = dur.minutes ? `${Math.abs(dur.minutes)}M` : '';
  const second = dur.seconds ? `${Math.abs(dur.seconds)}S` : '';

  return `${dayNotation}T${hour}${minute}${second}`;
}
