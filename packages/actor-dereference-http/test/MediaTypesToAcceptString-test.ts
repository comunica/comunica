import { mediaTypesToAcceptString } from '../lib/ActorDereferenceHttpBase';

describe('mediaTypesToAcceptString', () => {
  it('should stringify empty media types to any', () => {
    return expect(mediaTypesToAcceptString({}, 100)).toEqual('*/*');
  });

  it('should stringify a single media type', () => {
    return expect(mediaTypesToAcceptString({ a: 1 }, 100)).toEqual('a');
  });

  it('should stringify a single prioritized media type', () => {
    return expect(mediaTypesToAcceptString({ a: 0.5 }, 100)).toEqual('a;q=0.5');
  });

  it('should stringify three media types', () => {
    expect(mediaTypesToAcceptString({ a: 1, b: 1, c: 1 }, 100)).toEqual('a,b,c');
    expect(mediaTypesToAcceptString({ b: 1, c: 1, a: 1 }, 100)).toEqual('a,b,c');
    expect(mediaTypesToAcceptString({ c: 1, a: 1, b: 1 }, 100)).toEqual('a,b,c');
  });

  it('should stringify three prioritized media types', () => {
    return expect(mediaTypesToAcceptString({ a: 1, b: 0.8, c: 0.2 }, 100))
      .toEqual('a,b;q=0.8,c;q=0.2');
  });

  it('should only allow 3 digits after decimal point', () => {
    return expect(mediaTypesToAcceptString({ a: 1, b: 0.811_111_111, c: 0.211_111_111_1 }, 100))
      .toEqual('a,b;q=0.811,c;q=0.211');
  });

  it('should sort by decreasing priorities', () => {
    return expect(mediaTypesToAcceptString({ a: 0.2, b: 1, c: 0.8 }, 100))
      .toEqual('b,c;q=0.8,a;q=0.2');
  });

  it('should cut as much as needed for a wildcard (1)', () => {
    return expect(mediaTypesToAcceptString({ a: 1, b: 0.8, cdef: 0.2 }, 19))
      .toEqual('a,b;q=0.8,*/*;q=0.1');
  });

  it('should cut as much as needed for a wildcard (2)', () => {
    return expect(mediaTypesToAcceptString({ a: 1, b: 0.8, cd: 0.2, f: 0.1 }, 19))
      .toEqual('a,b;q=0.8,*/*;q=0.1');
  });

  it('should cut as much as needed for a wildcard (3)', () => {
    return expect(mediaTypesToAcceptString({ abcdef: 1, ef: 1 }, 6))
      .toEqual('*/*;q=0.1');
  });

  it('should not cut off incorrectly at the maxAcceptHeaderLength boundary', () => {
    const maxHeaderLength = 127;
    // Subtract 6 for ';q=0.8'
    const typeLength = Math.ceil((maxHeaderLength - 6) / 2);
    const a = 'a'.repeat(typeLength - 1);
    const b = 'b'.repeat(typeLength - 1);
    return expect(mediaTypesToAcceptString({ [a]: 1, [b]: 0.8 }, maxHeaderLength))
      .toEqual(`${a},${b};q=0.8`);
  });
});
