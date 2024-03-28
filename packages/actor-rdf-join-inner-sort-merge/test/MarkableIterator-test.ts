import { ArrayIterator } from 'asynciterator';
import { MarkableIterator } from '../lib/MarkableIterator';

describe('MarkableIterator', () => {
  it('should pass an empty iterator', async() => {
    await expect(new MarkableIterator(
      new ArrayIterator([], { autoStart: false }),
      { autoStart: false },
    ).toArray()).resolves.toEqual([]);
  });

  it('should pass a non-empty iterator', async() => {
    await expect(new MarkableIterator(
      new ArrayIterator([ 1, 2, 3 ], { autoStart: false }),
      { autoStart: false },
    ).toArray()).resolves.toEqual([ 1, 2, 3 ]);
  });

  it('should allow marking and restoring of elements before end', async() => {
    const it = new MarkableIterator(new ArrayIterator([ 1, 2, 3 ]));
    await new Promise(setImmediate);

    expect(it.read()).toBe(1);

    it.mark();

    expect(it.read()).toBe(2);
    expect(it.read()).toBe(3);

    it.restoreMark();

    expect(it.read()).toBe(2);
    expect(it.read()).toBe(3);

    await new Promise(setImmediate);
    expect(it.done).toBeTruthy();
  });

  it('should allow marking and restoring of elements until end', async() => {
    const it = new MarkableIterator(new ArrayIterator([ 1, 2, 3 ]));
    await new Promise(setImmediate);

    expect(it.read()).toBe(1);

    it.mark();

    expect(it.read()).toBe(2);
    expect(it.read()).toBe(3);
    expect(it.read()).toBeNull();

    it.restoreMark();

    expect(it.read()).toBe(2);
    expect(it.read()).toBe(3);
    expect(it.read()).toBeNull();

    await new Promise(setImmediate);
    expect(it.done).toBeTruthy();
  });

  it('restoreMark should be ignored when mark has not been set yet', async() => {
    const it = new MarkableIterator(new ArrayIterator([ 1, 2, 3 ]));
    await new Promise(setImmediate);

    it.restoreMark();

    expect(it.read()).toBe(1);

    it.mark();

    expect(it.read()).toBe(2);
    expect(it.read()).toBe(3);

    it.restoreMark();

    expect(it.read()).toBe(2);
    expect(it.read()).toBe(3);

    await new Promise(setImmediate);
    expect(it.done).toBeTruthy();
  });
});
