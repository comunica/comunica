import { ActionContextKey } from '@comunica/core';
import type { IActionContextKey, IStatisticsHolder } from '@comunica/types';
import { StatisticsHolder } from '../lib';

describe('StatisticsHolder', () => {
  const key1: IActionContextKey<string> = new ActionContextKey<string>('key1');
  const key2: IActionContextKey<number> = new ActionContextKey<number>('key2');
  const key3: IActionContextKey<boolean[]> = new ActionContextKey<boolean[]>('key3');
  const key4: IActionContextKey<boolean[]> = new ActionContextKey<boolean[]>('key4');

  let statisticsHolder: StatisticsHolder;

  beforeEach(() => {});
  describe('for an empty instance', () => {
    let statisticsHolder: IStatisticsHolder;

    beforeEach(() => {
      statisticsHolder = new StatisticsHolder();
    });

    describe('set', () => {
      it('should add entries', () => {
        statisticsHolder.set(key1, 'abc');
        statisticsHolder.set(key2, 123);
        statisticsHolder.set(key3, [ true, false ]);

        expect(statisticsHolder.get(key1)).toBe('abc');
        expect(statisticsHolder.get(key2)).toBe(123);
        expect(statisticsHolder.get(key3)).toEqual([ true, false ]);
      });

      it('should fail during compilation for an incorrect key value', () => {
        // @ts-expect-error
        statisticsHolder.set(key1, 123);
      });
    });

    describe('get', () => {
      it('should get entries', () => {
        statisticsHolder.set(key1, 'abc');
        statisticsHolder.set(key3, [ true, false ]);

        expect(statisticsHolder.get(key1)).toBe('abc');
        expect(statisticsHolder.get(key2)).toBeUndefined();
        expect(statisticsHolder.get(key3)).toEqual([ true, false ]);
      });

      it('should fail during compilation for an incorrect key value', () => {
        // @ts-expect-error
        const a: number = statisticsHolder.get(key1);
      });
    });

    describe('delete', () => {
      it('should delete existing entries', () => {
        statisticsHolder.set(key1, 'abc');
        statisticsHolder.set(key2, 123);
        statisticsHolder.set(key3, [ true, false ]);
        statisticsHolder.delete(key1);
        statisticsHolder.delete(key3);

        expect(statisticsHolder.get(key1)).toBeUndefined();
        expect(statisticsHolder.get(key2)).toBe(123);
        expect(statisticsHolder.get(key3)).toBeUndefined();
      });

      it('should delete non-existing existing entries', () => {
        statisticsHolder.delete(key1);
        statisticsHolder.delete(key3);

        expect(statisticsHolder.get(key1)).toBeUndefined();
        expect(statisticsHolder.get(key2)).toBeUndefined();
        expect(statisticsHolder.get(key3)).toBeUndefined();
      });
    });

    describe('has', () => {
      it('should check entry containment', () => {
        statisticsHolder.set(key1, 'abc');
        statisticsHolder.set(key3, [ true, false ]);

        expect(statisticsHolder.has(key1)).toBe(true);
        expect(statisticsHolder.has(key2)).toBe(false);
        expect(statisticsHolder.has(key3)).toBe(true);
      });
    });

    describe('key', () => {
      it('should get the keys of existing entries', () => {
        statisticsHolder.set(key1, 'abc');
        statisticsHolder.set(key2, 123);
        statisticsHolder.set(key3, [ true, false ]);

        expect(statisticsHolder.keys()).toEqual([ key1, key2, key3 ]);
      });
    });
  });

  describe('complex cases', () => {
    it('should bind return type to key', () => {
      const statisticsHolder: IStatisticsHolder = new StatisticsHolder();
      statisticsHolder.set(key1, 'abc');
      statisticsHolder.set(key2, 123);
      statisticsHolder.set(key3, [ true, false ]);

      const value1: string | undefined = statisticsHolder.get(key1);
      const value2: number | undefined = statisticsHolder.get(key2);
      const value3: boolean[] | undefined = statisticsHolder.get(key3);

      expect(value1).toBe('abc');
      expect(value2).toBe(123);
      expect(value3).toEqual([ true, false ]);

      if (statisticsHolder.has(key1)) {
        const value1_2 = statisticsHolder.get(key1);
        // eslint-disable-next-line jest/no-conditional-expect
        expect(value1_2).toBe('abc');
      }
    });
  });
});
