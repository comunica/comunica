import { parseDate, parseDateTime } from '../../../lib/util/Parsing';

describe('util/parsing', () => {
  describe('parseXSDDateTime', () => {
    test('should parse dates correctly', () => {
      expect(parseDateTime('2010-06-21T11:28:01Z')).toEqual({
        year: 2_010,
        month: 6,
        day: 21,
        hours: 11,
        minutes: 28,
        seconds: 1,
        zoneHours: 0,
        zoneMinutes: 0,
      });

      expect(parseDateTime('2010-12-21T15:38:02-08:00')).toEqual({
        year: 2_010,
        month: 12,
        day: 21,
        hours: 15,
        minutes: 38,
        seconds: 2,
        zoneHours: -8,
        zoneMinutes: -0,
      });

      expect(parseDateTime('2008-06-20T23:59:00Z')).toEqual({
        year: 2_008,
        month: 6,
        day: 20,
        hours: 23,
        minutes: 59,
        seconds: 0,
        zoneHours: 0,
        zoneMinutes: 0,
      });

      expect(parseDateTime('2011-02-01T01:02:03')).toEqual({
        year: 2_011,
        month: 2,
        day: 1,
        hours: 1,
        minutes: 2,
        seconds: 3,
        zoneHours: undefined,
        zoneMinutes: undefined,
      });

      expect(parseDate('2011-02-01')).toEqual({
        year: 2_011,
        month: 2,
        day: 1,
        zoneHours: undefined,
        zoneMinutes: undefined,
      });
    });
  });
});
