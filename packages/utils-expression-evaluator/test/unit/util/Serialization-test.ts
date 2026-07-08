import {
  serializeDate,
  serializeDateTime,
  serializeDuration,
  serializeTime,
  serializeTimeZone,
} from '../../../lib/util/Serialization';

describe('Serialization', () => {
  describe('serializeTimeZone', () => {
    it('returns empty string when both zoneHours and zoneMinutes are undefined', () => {
      expect(serializeTimeZone({})).toBe('');
    });

    it('returns Z when both hours and minutes resolve to 0', () => {
      expect(serializeTimeZone({ zoneHours: 0, zoneMinutes: 0 })).toBe('Z');
    });

    it('serializes a positive timezone offset', () => {
      expect(serializeTimeZone({ zoneHours: 5, zoneMinutes: 30 })).toBe('+05:30');
    });

    it('serializes a negative timezone offset', () => {
      expect(serializeTimeZone({ zoneHours: -5, zoneMinutes: -30 })).toBe('-05:30');
    });

    it('uses 0 for zoneMinutes when only zoneHours is defined', () => {
      // Covers the ?? 0 fallback for zoneMinutes
      expect(serializeTimeZone({ zoneHours: 5 })).toBe('+05:00');
    });

    it('uses 0 for zoneHours when only zoneMinutes is defined', () => {
      // Covers the ?? 0 fallback for zoneHours
      expect(serializeTimeZone({ zoneMinutes: 30 })).toBe('+00:30');
    });
  });

  describe('serializeDate', () => {
    it('serializes a date without timezone', () => {
      expect(serializeDate({ year: 2021, month: 1, day: 5 })).toBe('2021-01-05');
    });

    it('serializes a date with timezone', () => {
      expect(serializeDate({ year: 2021, month: 6, day: 15, zoneHours: 2, zoneMinutes: 0 })).toBe('2021-06-15+02:00');
    });
  });

  describe('serializeTime', () => {
    it('serializes a time without timezone', () => {
      expect(serializeTime({ hours: 10, minutes: 30, seconds: 5 })).toBe('10:30:05');
    });
  });

  describe('serializeDateTime', () => {
    it('serializes a datetime', () => {
      expect(serializeDateTime({ year: 2021, month: 6, day: 15, hours: 10, minutes: 30, seconds: 0 }))
        .toBe('2021-06-15T10:30:00');
    });
  });

  describe('serializeDuration', () => {
    it('returns zeroString when all values are zero or missing', () => {
      expect(serializeDuration({})).toBe('PT0S');
      expect(serializeDuration({}, 'P0M')).toBe('P0M');
    });

    it('serializes a positive duration with only date parts', () => {
      expect(serializeDuration({ year: 1, month: 2, day: 3 })).toBe('P1Y2M3D');
    });

    it('serializes a positive duration with time parts', () => {
      expect(serializeDuration({ hours: 1, minutes: 30, seconds: 0 })).toBe('PT1H30M');
    });

    it('serializes a negative duration', () => {
      expect(serializeDuration({ year: -1, month: 0 })).toBe('-P1Y');
    });

    it('serializes a full duration', () => {
      expect(serializeDuration({ year: 1, month: 2, day: 3, hours: 4, minutes: 5, seconds: 6 }))
        .toBe('P1Y2M3DT4H5M6S');
    });
  });
});
