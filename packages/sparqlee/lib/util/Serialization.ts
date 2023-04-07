import type {
  IDateRepresentation,
  IDateTimeRepresentation,
  IDurationRepresentation,
  ITimeRepresentation, ITimeZoneRepresentation,
} from './DateTimeHelpers';

function numSerializer(num: number, min = 2): string {
  return num.toLocaleString(undefined, { minimumIntegerDigits: min, useGrouping: false });
}

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

export function serializeDate(date: IDateRepresentation): string {
  // https://www.w3.org/TR/xmlschema-2/#date-lexical-representation
  return `${numSerializer(date.year, 4)}-${numSerializer(date.month)}-${numSerializer(date.day)}${serializeTimeZone(date)}`;
}

export function serializeTime(time: ITimeRepresentation): string {
  // https://www.w3.org/TR/xmlschema-2/#time-lexical-repr
  return `${numSerializer(time.hours)}:${numSerializer(time.minutes)}:${numSerializer(time.seconds)}${serializeTimeZone(time)}`;
}

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
  if (!(dur.hours || dur.minutes || dur.seconds)) {
    return dayNotation;
  }

  const hour = dur.hours ? `${Math.abs(dur.hours)}H` : '';
  const minute = dur.minutes ? `${Math.abs(dur.minutes)}M` : '';
  const second = dur.seconds ? `${Math.abs(dur.seconds)}S` : '';

  return `${dayNotation}T${hour}${minute}${second}`;
}
