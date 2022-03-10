import type { IActionContext, IActionContextKey } from '@comunica/types';
import { ActionContext, ActionContextKey } from '../lib';

describe('ActionContext', () => {
  const key1: IActionContextKey<string> = new ActionContextKey<string>('key1');
  const key2: IActionContextKey<number> = new ActionContextKey<number>('key2');
  const key3: IActionContextKey<boolean[]> = new ActionContextKey<boolean[]>('key3');
  const key4: IActionContextKey<boolean[]> = new ActionContextKey<boolean[]>('key4');

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

        expect(context.get(key1)).toEqual('abc');
        expect(context.get(key2)).toEqual(123);
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

        expect(context.get(key1)).toEqual('abc');
        expect(context.get(key2)).toEqual(undefined);
        expect(context.get(key3)).toEqual([ true, false ]);
      });

      it('should fail during compilation for an incorrect key value', () => {
        // @ts-expect-error
        const a: number = context.get(key1);
      });
    });

    describe('getSafe', () => {
      beforeEach(() => {
        context = context
          .set(key1, 'abc')
          .set(key3, [ true, false ]);
      });

      it('should get entries', () => {
        expect(context.getSafe(key1)).toEqual('abc');
        expect(() => context.getSafe(key2)).toThrow(`Context entry ${key2.name} is required but not available`);
        expect(context.getSafe(key3)).toEqual([ true, false ]);
      });

      it('should fail during compilation for an incorrect key value', () => {
        // @ts-expect-error
        const a: number = context.getSafe(key1);
      });

      it('should fail during compilation for an undefined casting', () => {
        // @ts-expect-error
        const a: undefined = context.getSafe(key1);
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

        expect(context.get(key1)).toEqual(undefined);
        expect(context.get(key2)).toEqual(123);
        expect(context.get(key3)).toEqual(undefined);
      });

      it('should delete non-existing existing entries', () => {
        context = context
          .delete(key1)
          .delete(key3);

        expect(context.get(key1)).toEqual(undefined);
        expect(context.get(key2)).toEqual(undefined);
        expect(context.get(key3)).toEqual(undefined);
      });
    });

    describe('has', () => {
      it('should check entry containment', () => {
        context = context
          .set(key1, 'abc')
          .set(key3, [ true, false ]);

        expect(context.has(key1)).toEqual(true);
        expect(context.has(key2)).toEqual(false);
        expect(context.has(key3)).toEqual(true);
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

        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        expect(context.toString()).toEqual(`ActionContext({"key1":"abc","key2":123,"key3":[true,false]})`);
      });
    });

    describe('util.inspect', () => {
      it('should return a string representation', () => {
        context = context
          .set(key1, 'abc')
          .set(key2, 123)
          .set(key3, [ true, false ]);

        expect((<any> context)[Symbol.for('nodejs.util.inspect.custom')]())
          .toEqual(`ActionContext({
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

  describe('complex cases', () => {
    it('should bind return type to key', () => {
      const context: IActionContext = new ActionContext()
        .set(key1, 'abc')
        .set(key2, 123)
        .set(key3, [ true, false ]);

      const value1: string | undefined = context.get(key1);
      const value2: number | undefined = context.get(key2);
      const value3: boolean[] | undefined = context.get(key3);

      expect(value1).toEqual('abc');
      expect(value2).toEqual(123);
      expect(value3).toEqual([ true, false ]);

      if (context.has(key1)) {
        const value1_2 = context.get(key1);
        expect(value1_2).toEqual('abc');
      }
    });
  });
});
