import { ActorHttp } from '..';
import 'cross-fetch/polyfill';

describe('ActorHttp', () => {
  describe('#headersToHash', () => {
    it('should handle empty headers', () => {
      expect(ActorHttp.headersToHash(new Headers())).toEqual({});
    });

    it('should handle non-empty headers', () => {
      expect(ActorHttp.headersToHash(new Headers({
        a: 'b',
        c: 'd',
      }))).toEqual({
        a: 'b',
        c: 'd',
      });
    });

    it('should handle headers with multi-valued entries', () => {
      expect(ActorHttp.headersToHash(new Headers([
        [ 'a', 'a1' ],
        [ 'a', 'a2' ],
        [ 'b', 'b1' ],
        [ 'b', 'b2' ],
      ]))).toEqual({
        a: 'a1, a2',
        b: 'b1, b2',
      });
    });
  });
});
