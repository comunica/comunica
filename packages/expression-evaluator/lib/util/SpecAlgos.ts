import type { IDateTimeRepresentation, IDurationRepresentation, ITimeZoneRepresentation } from '@comunica/types';
import { toUTCDate } from './DateTimeHelpers';

function fDiv(arg: number, high: number, low = 0): { intDiv: number; remainder: number } {
  // Adds the 4 spec functions into one since they are highly related,
  // and fQuotient and modulo are almost always called in pairs.
  const first = arg - low;
  const second = high - low;
  const intDiv = Math.floor(first / second);
  return { intDiv, remainder: arg - intDiv * second };
}

export function maximumDayInMonthFor(yearValue: number, monthValue: number): number {
  const { intDiv: additionalYears, remainder: month } = fDiv(monthValue, 13, 1);
  const year = yearValue + additionalYears;

  if ([ 1, 3, 5, 7, 8, 10, 12 ].includes(month)) {
    return 31;
  }
  if ([ 4, 6, 9, 11 ].includes(month)) {
    return 30;
  }
  if (month === 2 && (
    fDiv(year, 400).remainder === 0 ||
    (fDiv(year, 100).remainder !== 0 && fDiv(year, 4).remainder === 0))) {
    return 29;
  }
  return 28;
}

// https://www.w3.org/TR/xmlschema-2/#adding-durations-to-dateTimes
export function addDurationToDateTime(date: IDateTimeRepresentation, duration: IDurationRepresentation):
IDateTimeRepresentation {
  // Used to cary over optional fields like timezone
  const newDate: IDateTimeRepresentation = { ...date };

  // Month
  let tempDiv = fDiv(date.month + duration.month, 13, 1);
  newDate.month = tempDiv.remainder;
  // Year
  newDate.year = date.year + duration.year + tempDiv.intDiv;
  // Seconds
  tempDiv = fDiv(date.seconds + duration.seconds, 60);
  newDate.seconds = tempDiv.remainder;
  // Minutes
  tempDiv = fDiv(date.minutes + duration.minutes + tempDiv.intDiv, 60);
  newDate.minutes = tempDiv.remainder;
  // Hours
  tempDiv = fDiv(date.hours + duration.hours + tempDiv.intDiv, 24);
  newDate.hours = tempDiv.remainder;

  // We skip a part of the spec code since: Defined spec code can not happen since it would be an invalid literal

  newDate.day = date.day + duration.day + tempDiv.intDiv;

  while (true) {
    let carry;
    if (newDate.day < 1) {
      newDate.day += maximumDayInMonthFor(newDate.year, newDate.month - 1);
      carry = -1;
    } else if (newDate.day > maximumDayInMonthFor(newDate.year, newDate.month)) {
      newDate.day -= maximumDayInMonthFor(newDate.year, newDate.month);
      carry = 1;
    } else {
      break;
    }
    tempDiv = fDiv(newDate.month + carry, 13, 1);
    newDate.month = tempDiv.remainder;
    newDate.year += tempDiv.intDiv;
  }
  return newDate;
}

export function elapsedDuration(
  first: IDateTimeRepresentation,
  second: IDateTimeRepresentation,
  defaultTimeZone: ITimeZoneRepresentation,
): Partial<IDurationRepresentation> {
  const d1 = toUTCDate(first, defaultTimeZone);
  const d2 = toUTCDate(second, defaultTimeZone);
  const diff = d1.getTime() - d2.getTime();
  return {
    day: Math.floor(diff / (1_000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1_000 * 60 * 60 * 24)) / (1_000 * 60 * 60)),
    minutes: Math.floor(diff % (1_000 * 60 * 60) / (1_000 * 60)),
    seconds: diff % (1_000 * 60),
  };
}
