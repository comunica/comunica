import { extractTimeZone, toDateTimeRepresentation } from '../../../lib/util/DateTimeHelpers';

function dateWithOffset(timezoneOffset: number): Date {
  const date = new Date(1_234_567_890_000);
  jest.spyOn(date, 'getTimezoneOffset').mockReturnValue(timezoneOffset);
  return date;
}

describe('DateTimeHelpers', () => {
  describe('extractTimeZone', () => {
    it('returns Z for UTC', () => {
      expect(extractTimeZone(dateWithOffset(0))).toEqual({ zoneHours: 0, zoneMinutes: 0 });
    });

    it('returns a positive zone for timezones east of UTC', () => {
      expect(extractTimeZone(dateWithOffset(-60))).toEqual({ zoneHours: 1, zoneMinutes: 0 });
    });

    it('returns a negative zone for timezones west of UTC', () => {
      expect(extractTimeZone(dateWithOffset(300))).toEqual({ zoneHours: -5, zoneMinutes: 0 });
    });

    it('splits fractional hour offsets into whole hours and minutes', () => {
      expect(extractTimeZone(dateWithOffset(-330))).toEqual({ zoneHours: 5, zoneMinutes: 30 });
      expect(extractTimeZone(dateWithOffset(210))).toEqual({ zoneHours: -3, zoneMinutes: -30 });
    });
  });

  describe('toDateTimeRepresentation', () => {
    const date = new Date(1_234_567_890_000);

    it('represents the date in UTC', () => {
      expect(toDateTimeRepresentation({ date, timeZone: { zoneHours: 0, zoneMinutes: 0 }})).toEqual({
        year: 2009,
        month: 2,
        day: 13,
        hours: 23,
        minutes: 31,
        seconds: 30,
        zoneHours: 0,
        zoneMinutes: 0,
      });
    });

    it('represents the date in the given timezone', () => {
      expect(toDateTimeRepresentation({ date, timeZone: { zoneHours: 5, zoneMinutes: 30 }})).toEqual({
        year: 2009,
        month: 2,
        day: 14,
        hours: 5,
        minutes: 1,
        seconds: 30,
        zoneHours: 5,
        zoneMinutes: 30,
      });
    });
  });
});
