import { parseDelimited, parseQueryTimes, REQUESTS_UNIT, toRequestsEntries } from '../lib/performanceRequests';

describe('parseDelimited', () => {
  it('parses rows and values', () => {
    expect(parseDelimited('a;b\nc;d\n')).toEqual([[ 'a', 'b' ], [ 'c', 'd' ]]);
  });

  it('parses a last row without a newline', () => {
    expect(parseDelimited('a;b\nc;')).toEqual([[ 'a', 'b' ], [ 'c', '' ]]);
  });

  it('parses windows newlines and lone carriage returns', () => {
    expect(parseDelimited('a\r\nb\rc')).toEqual([[ 'a' ], [ 'b' ], [ 'c' ]]);
  });

  it('parses quoted values with delimiters, newlines and doubled quotes', () => {
    expect(parseDelimited('"a;b";"c\nd";"e""f"\ng')).toEqual([[ 'a;b', 'c\nd', 'e"f' ], [ 'g' ]]);
  });

  it('parses other delimiters', () => {
    expect(parseDelimited('a,b;c', ',')).toEqual([[ 'a', 'b;c' ]]);
  });

  it('parses empty text', () => {
    expect(parseDelimited('')).toEqual([]);
  });
});

describe('parseQueryTimes', () => {
  it('parses the instantiations', () => {
    expect(parseQueryTimes(`name;id;error;httpRequests;time
C1;0;false;12.4;100
C1;1;true;;5
S1;0;false;0;7

`)).toEqual([
      { name: 'C1', failed: false, httpRequests: 12.4 },
      { name: 'C1', failed: true, httpRequests: undefined },
      { name: 'S1', failed: false, httpRequests: 0 },
    ]);
  });

  it('parses rows without a value for the requests', () => {
    expect(parseQueryTimes('name;error;httpRequests\n\nq;false')).toEqual([
      { name: 'q', failed: false, httpRequests: undefined },
    ]);
  });

  it('parses empty text', () => {
    expect(parseQueryTimes('\n')).toEqual([]);
  });

  it('throws on a missing column', () => {
    expect(() => parseQueryTimes('name;error\nq;false')).toThrow('The query times have no httpRequests column');
  });
});

describe('toRequestsEntries', () => {
  it('determines no entries without requests', () => {
    expect(toRequestsEntries('A', [])).toEqual([]);
    expect(toRequestsEntries('A', [
      { name: 'q1', failed: false, httpRequests: 0 },
      { name: 'q2', failed: false, httpRequests: undefined },
      { name: 'q3', failed: true, httpRequests: 10 },
    ])).toEqual([]);
  });

  it('sums the requests per query, and over the queries without failures', () => {
    expect(toRequestsEntries('A', [
      { name: 'q1', failed: false, httpRequests: 10.4 },
      { name: 'q1', failed: false, httpRequests: 20.6 },
      { name: 'q2', failed: false, httpRequests: 5 },
      { name: 'q2', failed: true, httpRequests: undefined },
      { name: 'q3', failed: true, httpRequests: undefined },
      { name: 'q4', failed: false, httpRequests: undefined },
    ])).toEqual([
      { name: 'A', unit: REQUESTS_UNIT, value: 31, extra: 'Queries: 4; Excluded: [q2,q3]' },
      { name: 'A - q1', unit: REQUESTS_UNIT, value: 31, extra: 'Failed: 0/2; Requests: [10,21]' },
      { name: 'A - q2', unit: REQUESTS_UNIT, value: 5, extra: 'Failed: 1/2; Requests: [5]' },
      { name: 'A - q3', unit: REQUESTS_UNIT, value: null, extra: 'Failed: 1/1; Requests: []' },
      { name: 'A - q4', unit: REQUESTS_UNIT, value: 0, extra: 'Failed: 0/1; Requests: [0]' },
    ]);
  });
});
