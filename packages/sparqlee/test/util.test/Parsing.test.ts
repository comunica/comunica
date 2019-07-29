import { parseXSDDateTime } from '../../lib/util/Parsing';

describe('util/parsing', () => {
  describe('parseXSDDateTime', () => {
    test('should parse dates correctly', () => {
      expect(parseXSDDateTime('2010-06-21T11:28:01Z')).toEqual({
        year: '2010',
        month: '06',
        day: '21',
        hours: '11',
        minutes: '28',
        seconds: '01',
        timezone: 'Z',
      });

      expect(parseXSDDateTime('2010-12-21T15:38:02-08:00')).toEqual({
        year: '2010',
        month: '12',
        day: '21',
        hours: '15',
        minutes: '38',
        seconds: '02',
        timezone: '-08:00',
      });

      expect(parseXSDDateTime('2008-06-20T23:59:00Z')).toEqual({
        year: '2008',
        month: '06',
        day: '20',
        hours: '23',
        minutes: '59',
        seconds: '00',
        timezone: 'Z',
      });

      expect(parseXSDDateTime('2011-02-01T01:02:03')).toEqual({
        year: '2011',
        month: '02',
        day: '01',
        hours: '01',
        minutes: '02',
        seconds: '03',
        timezone: '',
      });

      expect(parseXSDDateTime('2011-02-01')).toEqual({
        year: '2011',
        month: '02',
        day: '01',
        hours: '00',
        minutes: '00',
        seconds: '00',
        timezone: '',
      });
    });
  });
});
