import { KeysInitQuery } from '@comunica/context-entries';
import type { IActionContext, IActionContextKey } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ActionContext, ActionContextKey } from '../lib';

describe('ActionContext', () => {
  const key1: IActionContextKey<string> = new ActionContextKey<string>('key1');
  const key2: IActionContextKey<number> = new ActionContextKey<number>('key2');
  const key3: IActionContextKey<boolean[]> = new ActionContextKey<boolean[]>('key3');

  describe('for an empty instance', () => {
    let context: IActionContext;
    beforeEach(() => {
      context = new ActionContext();
    });

    describe('set', () => {
      it('should add entries', () => {
        context = context
          .set(key1, 'abc')
          .set(key2, 123)
          .set(key3, [ true, false ]);

        expect(context.get(key1)).toBe('abc');
        expect(context.get(key2)).toBe(123);
        context.getSafe(key3).slice(1, 2);
        expect(context.get(key3)).toEqual([ true, false ]);
      });

      it('should fail during compilation for an incorrect key value', () => {
        // @ts-expect-error
        context.set(key1, 123);
      });
    });

    describe('get', () => {
      it('should get entries', () => {
        context = context
          .set(key1, 'abc')
          .set(key3, [ true, false ]);

        expect(context.get(key1)).toBe('abc');
        expect(context.get(key2)).toBeUndefined();
        expect(context.get(key3)).toEqual([ true, false ]);
      });

      it('should fail during compilation for an incorrect key value', () => {
        // @ts-expect-error
        const _a: number = context.get(key1);
      });
    });

    describe('getSafe', () => {
      beforeEach(() => {
        context = context
          .set(key1, 'abc')
          .set(key3, [ true, false ]);
      });

      it('should get entries', () => {
        expect(context.getSafe(key1)).toBe('abc');
        expect(() => context.getSafe(key2)).toThrow(`Context entry ${key2.name} is required but not available`);
        expect(context.getSafe(key3)).toEqual([ true, false ]);
      });

      it('should get a complex object', () => {
        context = context
          .set(KeysInitQuery.dataFactory, new DataFactory());

        const df = context.getSafe(KeysInitQuery.dataFactory);
        expect(df).toBeInstanceOf(DataFactory);
        expect(df.literal('abc').termType).toBe('Literal');
      });

      it('should fail during compilation for an incorrect key value', () => {
        // @ts-expect-error
        const _a: number = context.getSafe(key1);
      });

      it('should fail during compilation for an undefined casting', () => {
        // @ts-expect-error
        const _a: undefined = context.getSafe(key1);
      });
    });

    describe('delete', () => {
      it('should delete existing entries', () => {
        context = context
          .set(key1, 'abc')
          .set(key2, 123)
          .set(key3, [ true, false ])
          .delete(key1)
          .delete(key3);

        expect(context.get(key1)).toBeUndefined();
        expect(context.get(key2)).toBe(123);
        expect(context.get(key3)).toBeUndefined();
      });

      it('should delete non-existing existing entries', () => {
        context = context
          .delete(key1)
          .delete(key3);

        expect(context.get(key1)).toBeUndefined();
        expect(context.get(key2)).toBeUndefined();
        expect(context.get(key3)).toBeUndefined();
      });
    });

    describe('has', () => {
      it('should check entry containment', () => {
        context = context
          .set(key1, 'abc')
          .set(key3, [ true, false ]);

        expect(context.has(key1)).toBe(true);
        expect(context.has(key2)).toBe(false);
        expect(context.has(key3)).toBe(true);
      });
    });

    describe('merge', () => {
      it('should merge 3 contexts', () => {
        context = context
          .set(key1, 'abc')
          .merge(
            new ActionContext({ a: '1', b: '1' }),
            new ActionContext({ b: '2', c: '2' }),
          );

        expect(context.toJS()).toEqual({
          key1: 'abc',
          a: '1',
          b: '2',
          c: '2',
        });
      });
    });

    describe('key', () => {
      it('should get the keys of existing entries', () => {
        context = context
          .set(key1, 'abc')
          .set(key2, 123)
          .set(key3, [ true, false ]);

        expect(context.keys()).toEqual([ key1, key2, key3 ]);
      });
    });

    describe('toString', () => {
      it('should return a string representation', () => {
        context = context
          .set(key1, 'abc')
          .set(key2, 123)
          .set(key3, [ true, false ]);

        // eslint-disable-next-line ts/no-base-to-string
        expect(context.toString()).toBe(`ActionContext({"key1":"abc","key2":123,"key3":[true,false]})`);
      });
    });

    describe('util.inspect', () => {
      it('should return a string representation', () => {
        context = context
          .set(key1, 'abc')
          .set(key2, 123)
          .set(key3, [ true, false ]);

        expect((<any> context)[Symbol.for('nodejs.util.inspect.custom')]())
          .toBe(`ActionContext({
  "key1": "abc",
  "key2": 123,
  "key3": [
    true,
    false
  ]
})`);
      });
    });

    describe('ensureActionContext', () => {
      it('should handle undefined', () => {
        context = ActionContext.ensureActionContext();
        expect(context.toJS()).toEqual({});
      });

      it('should handle a record', () => {
        context = ActionContext.ensureActionContext({
          a: 'b',
        });
        expect(context.toJS()).toEqual({
          a: 'b',
        });
      });

      it('should handle an ActionContext', () => {
        context = ActionContext.ensureActionContext(new ActionContext({
          a: 'b',
        }));
        expect(context.toJS()).toEqual({
          a: 'b',
        });
      });
    });
  });

  describe('immutability', () => {
    it('should not modify a context on any operation', () => {
      const context = new ActionContext({ key1: 'abc' });
      context.set(key2, 123);
      context.setRaw('key3', [ true ]);
      context.delete(key1);
      context.merge(new ActionContext({ key1: 'def' }));
      expect(context.toJS()).toEqual({ key1: 'abc' });
    });

    it('should not be modified by later changes to the record it was created from', () => {
      const record: Record<string, any> = { key1: 'abc' };
      const context = new ActionContext(record);
      record.key1 = 'def';
      expect(context.get(key1)).toBe('abc');
    });
  });

  describe('delete', () => {
    it('should delete an existing entry', () => {
      const context = new ActionContext({ key1: 'abc', key2: 123 }).delete(key1);
      expect(context.toJS()).toEqual({ key2: 123 });
    });

    it('should return an equal context for a missing entry', () => {
      const context = new ActionContext({ key2: 123 });
      expect(context.delete(key1).toJS()).toEqual({ key2: 123 });
    });
  });

  describe('merge', () => {
    it('should return the same context if nothing is merged', () => {
      const context = new ActionContext({ key1: 'abc' });
      expect(context.merge()).toBe(context);
      expect(context.merge(new ActionContext())).toBe(context);
    });
  });

  describe('setDefault', () => {
    it('should only set missing entries', () => {
      const context = new ActionContext({ key1: 'abc' });
      expect(context.setDefault(key1, 'def')).toBe(context);
      expect(context.setDefault(key2, 123).toJS()).toEqual({ key1: 'abc', key2: 123 });
    });
  });

  describe('toJS', () => {
    it('should return a new record that keeps the values as-is', () => {
      const nested = { a: [{ b: 1 }]};
      const context = new ActionContext({ nested });
      const js = context.toJS();
      expect(js).toEqual({ nested });
      expect(js.nested).toBe(nested);
      js.key1 = 'abc';
      expect(context.get(key1)).toBeUndefined();
    });
  });

  describe('complex cases', () => {
    it('should bind return type to key', () => {
      const context: IActionContext = new ActionContext()
        .set(key1, 'abc')
        .set(key2, 123)
        .set(key3, [ true, false ]);

      const value1: string | undefined = context.get(key1);
      const value2: number | undefined = context.get(key2);
      const value3: boolean[] | undefined = context.get(key3);

      expect(value1).toBe('abc');
      expect(value2).toBe(123);
      expect(value3).toEqual([ true, false ]);

      if (context.has(key1)) {
        const value1_2 = context.get(key1);
        // eslint-disable-next-line jest/no-conditional-expect
        expect(value1_2).toBe('abc');
      }
    });
  });
});
