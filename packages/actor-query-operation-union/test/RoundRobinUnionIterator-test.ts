import {AsyncIterator} from "asynciterator";
import {RoundRobinUnionIterator} from "../lib/RoundRobinUnionIterator";
const arrayifyStream = require('arrayify-stream');

describe('RoundRobinUnionIterator', () => {
  let sources: AsyncIterator<number>[];
  let it1: AsyncIterator<number>;
  let it2: AsyncIterator<number>;
  let rrit: RoundRobinUnionIterator;

  beforeEach(() => {
    sources = [
      it1 = AsyncIterator.range(0, 3),
      it2 = AsyncIterator.range(3, 6),
    ];
    rrit = new RoundRobinUnionIterator(sources);
  });

  it('should be constructable with 0 sources', () => {
    return expect(new RoundRobinUnionIterator([])).toBeInstanceOf(AsyncIterator);
  });

  it('should be constructable with 1 source', () => {
    return expect(new RoundRobinUnionIterator([AsyncIterator.range(0, 3)])).toBeInstanceOf(AsyncIterator);
  });

  it('should be constructable with 2 sources', () => {
    return expect(new RoundRobinUnionIterator([AsyncIterator.range(0, 3), AsyncIterator.range(3, 6)]))
      .toBeInstanceOf(AsyncIterator);
  });

  it('should be an AsyncIterator', () => {
    return expect(rrit).toBeInstanceOf(AsyncIterator);
  });

  it('should emit an error when the first iterator emits an error', () => {
    const p = arrayifyStream(rrit);
    const error = new Error('error');
    it1.emit('error', error);
    return p.catch((e) => {
      expect(e).toBe(error);
    });
  });

  it('should emit an error when the second iterator emits an error', () => {
    const p = arrayifyStream(rrit);
    const error = new Error('error');
    it2.emit('error', error);
    return p.catch((e) => {
      expect(e).toBe(error);
    });
  });

  it('should not emit an error no iterators emit an error', () => {
    const p = arrayifyStream(rrit);
    return p.then((data) => {
      expect(data).toBeTruthy();
    });
  });

  it('should make a round-robin union of the data elements', async () => {
    return expect(await arrayifyStream(rrit)).toEqual([0, 3, 1, 4, 2, 5, 3, 6]);
  });

  it('should make a round-robin union of the data elements for 3 sources', async () => {
    rrit = new RoundRobinUnionIterator([
      it1 = AsyncIterator.range(0, 2),
      it2 = AsyncIterator.range(2, 4),
      it2 = AsyncIterator.range(4, 6),
    ]);
    return expect(await arrayifyStream(rrit)).toEqual([0, 2, 4, 1, 3, 5, 2, 4, 6]);
  });
});
