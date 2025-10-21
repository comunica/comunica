import { ArrayIterator } from 'asynciterator';
import { instrumentIterator } from '../lib/instrumentIterator';

describe('instrumentIterator', () => {
  it('should instrument an iterator', async() => {
    const it1 = new ArrayIterator([ 1 ], { autoStart: false });
    const p = instrumentIterator(it1);
    it1.on('data', () => {
      // Go into flow-mode.
    });
    const counters = await p;
    expect(it1).toHaveProperty('_profileInstrumented');
    expect(counters).toEqual({
      count: 1,
      timeLife: expect.any(Number),
      timeSelf: expect.any(Number),
    });
  });

  it('should not instrument an iterator twice', async() => {
    const it1 = new ArrayIterator([ 1 ], { autoStart: false });
    const p1 = instrumentIterator(it1);
    const p2 = instrumentIterator(it1);
    it1.on('data', () => {
      // Go into flow-mode.
    });
    const counters1 = await p1;
    const counters2 = await p2;
    expect(it1).toHaveProperty('_profileInstrumented');
    expect(counters1).toEqual({
      count: 1,
      timeLife: expect.any(Number),
      timeSelf: expect.any(Number),
    });
    expect(counters2).toEqual({
      count: 0,
      timeLife: 0,
      timeSelf: 0,
    });
  });
});
