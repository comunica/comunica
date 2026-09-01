import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { instrumentIterator } from '../lib/instrumentIterator';

/**
 * Consume the given iterator by putting it in flow mode.
 */
function flow(iterator: any): void {
  iterator.on('data', () => {
    // Go into flow-mode.
  });
}

describe('instrumentIterator', () => {
  it('should instrument an iterator', async() => {
    const it1 = new ArrayIterator([ 1, 2 ], { autoStart: false });
    const instrumented = instrumentIterator(it1);
    flow(it1);

    await expect(instrumented.counters).resolves.toEqual({
      count: 2,
      timeLife: expect.any(Number),
      timeSelf: expect.any(Number),
      state: 'ended',
    });
  });

  it('should let every measurement of the same iterator observe the same reads', async() => {
    const it1 = new ArrayIterator([ 1, 2 ], { autoStart: false });
    const instrumented1 = instrumentIterator(it1);
    const instrumented2 = instrumentIterator(it1);
    flow(it1);

    await expect(instrumented1.counters).resolves.toEqual({
      count: 2,
      timeLife: expect.any(Number),
      timeSelf: expect.any(Number),
      state: 'ended',
    });
    await expect(instrumented2.counters).resolves.toEqual({
      count: 2,
      timeLife: expect.any(Number),
      timeSelf: expect.any(Number),
      state: 'ended',
    });
  });

  it('should not instrument the iterators that are read from', async() => {
    const source = new ArrayIterator([ 1, 2 ], { autoStart: false });
    const it1 = source.map(value => value * 2);
    const instrumented = instrumentIterator(it1);
    flow(it1);
    await instrumented.counters;

    expect(source).not.toHaveProperty('_profileCounters');
  });

  it('should measure the time spent within _read', async() => {
    const it1 = new BufferedIterator<number>({ autoStart: false });
    (<any> it1)._read = (count: number, done: () => void) => {
      (<any> it1)._push(1);
      it1.close();
      done();
    };
    const instrumented = instrumentIterator(it1);
    flow(it1);

    await expect(instrumented.counters).resolves.toEqual({
      count: 1,
      timeLife: expect.any(Number),
      timeSelf: expect.any(Number),
      state: 'ended',
    });
  });

  it('should report an iterator that was destroyed', async() => {
    const it1 = new ArrayIterator([ 1, 2 ], { autoStart: false });
    const instrumented = instrumentIterator(it1);
    it1.destroy();

    await expect(instrumented.counters).resolves.toEqual({
      count: 0,
      timeLife: expect.any(Number),
      timeSelf: 0,
      state: 'destroyed',
    });
  });

  it('should report an iterator that had already ended', async() => {
    const it1 = new ArrayIterator([ 1 ], { autoStart: false });
    flow(it1);
    await new Promise(resolve => it1.on('end', resolve));

    await expect(instrumentIterator(it1).counters).resolves.toEqual({
      count: 0,
      timeLife: expect.any(Number),
      timeSelf: 0,
      state: 'ended',
    });
  });

  it('should report an iterator that had already been destroyed', async() => {
    const it1 = new ArrayIterator([ 1 ], { autoStart: false });
    it1.destroy();

    await expect(instrumentIterator(it1).counters).resolves.toEqual({
      count: 0,
      timeLife: expect.any(Number),
      timeSelf: 0,
      state: 'destroyed',
    });
  });

  it('should report an iterator that is never consumed as unfinished', async() => {
    const it1 = new ArrayIterator([ 1, 2 ], { autoStart: false });
    const instrumented = instrumentIterator(it1);
    instrumented.finish();

    await expect(instrumented.counters).resolves.toEqual({
      count: 0,
      timeLife: expect.any(Number),
      timeSelf: 0,
      state: 'unfinished',
    });
  });

  it('should keep the counters of an iterator that already ended when finishing', async() => {
    const it1 = new ArrayIterator([ 1, 2 ], { autoStart: false });
    const instrumented = instrumentIterator(it1);
    flow(it1);
    await instrumented.counters;

    instrumented.finish();

    await expect(instrumented.counters).resolves.toEqual({
      count: 2,
      timeLife: expect.any(Number),
      timeSelf: expect.any(Number),
      state: 'ended',
    });
  });
});
