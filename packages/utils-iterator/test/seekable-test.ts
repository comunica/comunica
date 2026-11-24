import type { Bindings, BindingsStream } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { isSeekableBindingsStream, SeekableMappingIterator, seekBindingsStream } from '../lib/seekable';

describe('seekable bindings streams', () => {
  const target = <Bindings> <any> { dummy: true };
  let plain: BindingsStream;
  let seekable: BindingsStream;
  let seek: jest.Mock;

  beforeEach(() => {
    plain = <BindingsStream> <any> new ArrayIterator([], { autoStart: false });
    seek = jest.fn();
    seekable = Object.assign(<BindingsStream> <any> new ArrayIterator([], { autoStart: false }), { seek });
  });

  describe('isSeekableBindingsStream', () => {
    it('is false for a stream without a seek', () => {
      expect(isSeekableBindingsStream(plain)).toBe(false);
    });

    it('is true for a stream with a seek', () => {
      expect(isSeekableBindingsStream(seekable)).toBe(true);
    });
  });

  describe('seekBindingsStream', () => {
    it('seeks a stream that can', () => {
      seekBindingsStream(seekable, target);
      expect(seek).toHaveBeenCalledWith(target);
    });

    it('does nothing to a stream that cannot', () => {
      expect(() => seekBindingsStream(plain, target)).not.toThrow();
    });
  });

  describe('SeekableMappingIterator', () => {
    it('maps the items of its source', async() => {
      const source = new ArrayIterator([ 1, 2 ], { autoStart: false });
      const mapped = new SeekableMappingIterator(source, item => <Bindings> <any> { item }, seek);
      await expect(mapped.toArray()).resolves.toEqual([{ item: 1 }, { item: 2 }]);
    });

    it('forwards seeks', () => {
      const mapped = new SeekableMappingIterator(new ArrayIterator([], { autoStart: false }), item => item, seek);
      expect(isSeekableBindingsStream(mapped)).toBe(true);
      mapped.seek(target);
      expect(seek).toHaveBeenCalledWith(target);
    });
  });
});
