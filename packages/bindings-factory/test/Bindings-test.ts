import { SetUnionBindingsContextMergeHandler } from '@comunica/actor-merge-bindings-context-union';
import { ActionContext, ActionContextKey } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { Map } from 'immutable';
import { DataFactory } from 'rdf-data-factory';
import { Bindings } from '../lib/Bindings';
import 'jest-rdf';

const DF = new DataFactory();
const contextMergeHandlers = {};
describe('Bindings', () => {
  describe('without context', () => {
    let bindings: Bindings;

    beforeEach(() => {
      bindings = new Bindings(DF, Map<string, RDF.Term>([
        [ 'a', DF.namedNode('ex:a') ],
        [ 'b', DF.namedNode('ex:b') ],
        [ 'c', DF.namedNode('ex:c') ],
      ]), { contextMergeHandlers });
    });

    describe('has', () => {
      it('should return false for uncontained keys', () => {
        expect(bindings.has(DF.variable('d'))).toBeFalsy();
        expect(bindings.has(DF.variable('a.other'))).toBeFalsy();

        expect(bindings.has('d')).toBeFalsy();
        expect(bindings.has('a.other')).toBeFalsy();
      });

      it('should return true for contained keys', () => {
        expect(bindings.has(DF.variable('a'))).toBeTruthy();
        expect(bindings.has(DF.variable('b'))).toBeTruthy();
        expect(bindings.has(DF.variable('c'))).toBeTruthy();

        expect(bindings.has('a')).toBeTruthy();
        expect(bindings.has('b')).toBeTruthy();
        expect(bindings.has('c')).toBeTruthy();
      });
    });

    describe('get', () => {
      it('should return undefined for uncontained keys', () => {
        expect(bindings.get(DF.variable('d'))).toBeUndefined();
        expect(bindings.get(DF.variable('a.other'))).toBeUndefined();

        expect(bindings.get('d')).toBeUndefined();
        expect(bindings.get('a.other')).toBeUndefined();
      });

      it('should return for contained keys', () => {
        expect(bindings.get(DF.variable('a'))).toEqualRdfTerm(DF.namedNode('ex:a'));
        expect(bindings.get(DF.variable('b'))).toEqualRdfTerm(DF.namedNode('ex:b'));
        expect(bindings.get(DF.variable('c'))).toEqualRdfTerm(DF.namedNode('ex:c'));

        expect(bindings.get('a')).toEqualRdfTerm(DF.namedNode('ex:a'));
        expect(bindings.get('b')).toEqualRdfTerm(DF.namedNode('ex:b'));
        expect(bindings.get('c')).toEqualRdfTerm(DF.namedNode('ex:c'));
      });
    });

    describe('set', () => {
      it('should set a non-existing variable', () => {
        const bindingsNew = bindings.set(DF.variable('d'), DF.namedNode('ex:d'));
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.get(DF.variable('d'))).toEqual(DF.namedNode('ex:d'));
        expect(bindings.get(DF.variable('d'))).toBeUndefined();
      });

      it('should overwrite an existing variable', () => {
        const bindingsNew = bindings.set(DF.variable('c'), DF.namedNode('ex:c2'));
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c2'));
        expect(bindings.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c'));
      });

      it('should set a non-existing variable using string keys', () => {
        const bindingsNew = bindings.set('d', DF.namedNode('ex:d'));
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.get(DF.variable('d'))).toEqual(DF.namedNode('ex:d'));
        expect(bindings.get(DF.variable('d'))).toBeUndefined();
      });

      it('should overwrite an existing variable using string keys', () => {
        const bindingsNew = bindings.set('c', DF.namedNode('ex:c2'));
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c2'));
        expect(bindings.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c'));
      });
    });

    describe('delete', () => {
      it('should not do anything on a non-existing variable', () => {
        const bindingsNew = bindings.delete(DF.variable('d'));
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.size).toEqual(bindings.size);
      });

      it('should delete an existing variable', () => {
        const bindingsNew = bindings.delete(DF.variable('c'));
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.get(DF.variable('c'))).toBeUndefined();
        expect(bindingsNew.has(DF.variable('c'))).toBeFalsy();
        expect(bindings.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c'));
      });

      it('should not do anything on a non-existing variable using string keys', () => {
        const bindingsNew = bindings.delete('d');
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.size).toEqual(bindings.size);
      });

      it('should delete an existing variable using string keys', () => {
        const bindingsNew = bindings.delete('c');
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.get(DF.variable('c'))).toBeUndefined();
        expect(bindingsNew.has(DF.variable('c'))).toBeFalsy();
        expect(bindings.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c'));
      });
    });

    describe('keys', () => {
      it('should return the contained keys', () => {
        expect([ ...bindings.keys() ]).toEqual([
          DF.variable('a'),
          DF.variable('b'),
          DF.variable('c'),
        ]);
      });
    });

    describe('values', () => {
      it('should return the contained values', () => {
        expect([ ...bindings.values() ]).toEqual([
          DF.namedNode('ex:a'),
          DF.namedNode('ex:b'),
          DF.namedNode('ex:c'),
        ]);
      });
    });

    describe('forEach', () => {
      it('should iterate over all entries', () => {
        const cb = jest.fn();
        // eslint-disable-next-line unicorn/no-array-for-each
        bindings.forEach(cb);
        expect(cb).toHaveBeenCalledTimes(3);
        expect(cb).toHaveBeenNthCalledWith(1, DF.namedNode('ex:a'), DF.variable('a'));
        expect(cb).toHaveBeenNthCalledWith(2, DF.namedNode('ex:b'), DF.variable('b'));
        expect(cb).toHaveBeenNthCalledWith(3, DF.namedNode('ex:c'), DF.variable('c'));
      });
    });

    describe('size', () => {
      it('should return the number of entries', () => {
        expect(bindings.size).toBe(3);
      });
    });

    describe('Symbol.iterator', () => {
      it('should return an iterator over all entries', () => {
        expect([ ...bindings ]).toEqual([
          [ DF.variable('a'), DF.namedNode('ex:a') ],
          [ DF.variable('b'), DF.namedNode('ex:b') ],
          [ DF.variable('c'), DF.namedNode('ex:c') ],
        ]);
      });
    });

    describe('equals', () => {
      it('should be false for null', () => {
        expect(bindings.equals(null)).toBeFalsy();
      });

      it('should be false for undefined', () => {
        expect(bindings.equals(undefined)).toBeFalsy();
      });

      it('should be false for empty bindings', () => {
        expect(bindings.equals(new Bindings(DF, Map<string, RDF.Term>([]), { contextMergeHandlers }))).toBeFalsy();
      });

      it('should be false for bindings with fewer keys', () => {
        expect(bindings.equals(new Bindings(DF, Map<string, RDF.Term>([
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
        ]), { contextMergeHandlers }))).toBeFalsy();
      });

      it('should be false for bindings with more keys', () => {
        expect(bindings.equals(new Bindings(DF, Map<string, RDF.Term>([
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
          [ 'c', DF.namedNode('ex:c') ],
          [ 'd', DF.namedNode('ex:d') ],
        ]), { contextMergeHandlers }))).toBeFalsy();
      });

      it('should be false for bindings with the same amount of keys, but unequal', () => {
        expect(bindings.equals(new Bindings(DF, Map<string, RDF.Term>([
          [ 'a1', DF.namedNode('ex:a') ],
          [ 'b1', DF.namedNode('ex:b') ],
          [ 'c1', DF.namedNode('ex:c') ],
        ]), { contextMergeHandlers }))).toBeFalsy();
      });

      it('should be false for bindings with equal keys, but unequal values', () => {
        expect(bindings.equals(new Bindings(DF, Map<string, RDF.Term>([
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b1') ],
          [ 'c', DF.namedNode('ex:c') ],
        ]), { contextMergeHandlers }))).toBeFalsy();
      });

      it('should be true for bindings with equal keys and values', () => {
        expect(bindings.equals(new Bindings(DF, Map<string, RDF.Term>([
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
          [ 'c', DF.namedNode('ex:c') ],
        ]), { contextMergeHandlers }))).toBeTruthy();
      });

      it('should be true for itself', () => {
        expect(bindings.equals(bindings)).toBeTruthy();
      });
    });

    describe('filter', () => {
      it('should not change anything for a filter that always returns true', () => {
        const cb = jest.fn(() => true);
        const bindingsNew = bindings.filter(cb);
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.size).toEqual(bindings.size);

        expect(cb).toHaveBeenCalledTimes(3);
        expect(cb).toHaveBeenNthCalledWith(1, DF.namedNode('ex:a'), DF.variable('a'));
        expect(cb).toHaveBeenNthCalledWith(2, DF.namedNode('ex:b'), DF.variable('b'));
        expect(cb).toHaveBeenNthCalledWith(3, DF.namedNode('ex:c'), DF.variable('c'));
      });

      it('should filter a specific element', () => {
        const cb = jest.fn((value: RDF.Term) => value.value !== 'ex:b');
        const bindingsNew = bindings.filter(cb);
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.size).toBe(2);

        expect(bindingsNew.get(DF.variable('a'))).toEqual(DF.namedNode('ex:a'));
        expect(bindingsNew.get(DF.variable('b'))).toBeUndefined();
        expect(bindingsNew.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c'));

        expect(cb).toHaveBeenCalledTimes(3);
        expect(cb).toHaveBeenNthCalledWith(1, DF.namedNode('ex:a'), DF.variable('a'));
        expect(cb).toHaveBeenNthCalledWith(2, DF.namedNode('ex:b'), DF.variable('b'));
        expect(cb).toHaveBeenNthCalledWith(3, DF.namedNode('ex:c'), DF.variable('c'));
      });
    });

    describe('map', () => {
      it('should map values', () => {
        const cb = jest.fn((value: RDF.Term) => DF.namedNode(`${value.value}.2`));
        const bindingsNew = bindings.map(cb);
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.size).toBe(3);

        expect(bindingsNew.get(DF.variable('a'))).toEqual(DF.namedNode('ex:a.2'));
        expect(bindingsNew.get(DF.variable('b'))).toEqual(DF.namedNode('ex:b.2'));
        expect(bindingsNew.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c.2'));

        expect(cb).toHaveBeenCalledTimes(3);
        expect(cb).toHaveBeenNthCalledWith(1, DF.namedNode('ex:a'), DF.variable('a'));
        expect(cb).toHaveBeenNthCalledWith(2, DF.namedNode('ex:b'), DF.variable('b'));
        expect(cb).toHaveBeenNthCalledWith(3, DF.namedNode('ex:c'), DF.variable('c'));
      });
    });

    describe('merge', () => {
      it('should merge distinct bindings', () => {
        const bindingsOther = new Bindings(DF, Map<string, RDF.Term>([
          [ 'd', DF.namedNode('ex:d') ],
          [ 'e', DF.namedNode('ex:e') ],
          [ 'f', DF.namedNode('ex:f') ],
        ]), { contextMergeHandlers });

        const bindingsNew: Bindings = bindings.merge(bindingsOther)!;
        expect(bindingsNew).toBeDefined();
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.size).toBe(6);

        expect(bindingsNew.get(DF.variable('a'))).toEqual(DF.namedNode('ex:a'));
        expect(bindingsNew.get(DF.variable('b'))).toEqual(DF.namedNode('ex:b'));
        expect(bindingsNew.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c'));
        expect(bindingsNew.get(DF.variable('d'))).toEqual(DF.namedNode('ex:d'));
        expect(bindingsNew.get(DF.variable('e'))).toEqual(DF.namedNode('ex:e'));
        expect(bindingsNew.get(DF.variable('f'))).toEqual(DF.namedNode('ex:f'));
      });

      it('should merge overlapping compatible bindings', () => {
        const bindingsOther = new Bindings(DF, Map<string, RDF.Term>([
          [ 'd', DF.namedNode('ex:d') ],
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
        ]), { contextMergeHandlers });

        const bindingsNew: Bindings = bindings.merge(bindingsOther)!;
        expect(bindingsNew).toBeDefined();
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.size).toBe(4);

        expect(bindingsNew.get(DF.variable('a'))).toEqual(DF.namedNode('ex:a'));
        expect(bindingsNew.get(DF.variable('b'))).toEqual(DF.namedNode('ex:b'));
        expect(bindingsNew.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c'));
        expect(bindingsNew.get(DF.variable('d'))).toEqual(DF.namedNode('ex:d'));
      });

      it('should return undefined on overlapping incompatible bindings', () => {
        const bindingsOther = new Bindings(DF, Map<string, RDF.Term>([
          [ 'a', DF.namedNode('ex:b') ],
        ]), { contextMergeHandlers });

        const bindingsNew: Bindings = bindings.merge(bindingsOther)!;
        expect(bindingsNew).toBeUndefined();
      });
    });

    describe('mergeWith', () => {
      it('should merge distinct bindings', () => {
        const bindingsOther = new Bindings(DF, Map<string, RDF.Term>([
          [ 'd', DF.namedNode('ex:d') ],
          [ 'e', DF.namedNode('ex:e') ],
          [ 'f', DF.namedNode('ex:f') ],
        ]), { contextMergeHandlers });

        const cb = jest.fn();
        const bindingsNew: Bindings = bindings.mergeWith(cb, bindingsOther);
        expect(bindingsNew).toBeDefined();
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.size).toBe(6);

        expect(bindingsNew.get(DF.variable('a'))).toEqual(DF.namedNode('ex:a'));
        expect(bindingsNew.get(DF.variable('b'))).toEqual(DF.namedNode('ex:b'));
        expect(bindingsNew.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c'));
        expect(bindingsNew.get(DF.variable('d'))).toEqual(DF.namedNode('ex:d'));
        expect(bindingsNew.get(DF.variable('e'))).toEqual(DF.namedNode('ex:e'));
        expect(bindingsNew.get(DF.variable('f'))).toEqual(DF.namedNode('ex:f'));

        expect(cb).not.toHaveBeenCalled();
      });

      it('should merge overlapping compatible bindings', () => {
        const bindingsOther = new Bindings(DF, Map<string, RDF.Term>([
          [ 'd', DF.namedNode('ex:d') ],
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
        ]), { contextMergeHandlers });

        const cb = jest.fn();
        const bindingsNew: Bindings = bindings.mergeWith(cb, bindingsOther);
        expect(bindingsNew).toBeDefined();
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.size).toBe(4);

        expect(bindingsNew.get(DF.variable('a'))).toEqual(DF.namedNode('ex:a'));
        expect(bindingsNew.get(DF.variable('b'))).toEqual(DF.namedNode('ex:b'));
        expect(bindingsNew.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c'));
        expect(bindingsNew.get(DF.variable('d'))).toEqual(DF.namedNode('ex:d'));

        expect(cb).not.toHaveBeenCalled();
      });

      it('should return undefined on overlapping incompatible bindings', () => {
        const bindingsOther = new Bindings(DF, Map<string, RDF.Term>([
          [ 'a', DF.namedNode('ex:b') ],
        ]), { contextMergeHandlers });

        const cb = jest.fn((left: RDF.Term, right: RDF.Term) => DF.namedNode(`${left.value}+${right.value}`));
        const bindingsNew: Bindings = bindings.mergeWith(cb, bindingsOther);
        expect(bindingsNew).toBeDefined();
        expect(bindingsNew).not.toBe(bindings);
        expect(bindingsNew.size).toBe(3);

        expect(bindingsNew.get(DF.variable('a'))).toEqual(DF.namedNode('ex:a+ex:b'));
        expect(bindingsNew.get(DF.variable('b'))).toEqual(DF.namedNode('ex:b'));
        expect(bindingsNew.get(DF.variable('c'))).toEqual(DF.namedNode('ex:c'));

        expect(cb).toHaveBeenCalledTimes(1);
        expect(cb).toHaveBeenNthCalledWith(1, DF.namedNode('ex:a'), DF.namedNode('ex:b'), DF.variable('a'));
      });
    });

    describe('toString', () => {
      it('should stringify empty bindings', () => {
        expect(new Bindings(DF, Map<string, RDF.Term>(), { contextMergeHandlers }).toString()).toBe(`{}`);
      });

      it('should stringify non-empty bindings', () => {
        expect(bindings.toString()).toBe(`{
  "a": "ex:a",
  "b": "ex:b",
  "c": "ex:c"
}`);
      });
    });
  });

  describe('with context', () => {
    let bindings: Bindings;
    let bindingsNoContext: Bindings;

    beforeEach(() => {
      bindings = new Bindings(
        DF,
        Map<string, RDF.Term>([
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
          [ 'c', DF.namedNode('ex:c') ],
        ]),
        {
          contextMergeHandlers: { source: new SetUnionBindingsContextMergeHandler() },
          context: new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3' ]}),
        },
      );
      bindingsNoContext = new Bindings(
        DF,
        Map<string, RDF.Term>([
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
          [ 'd', DF.namedNode('ex:d') ],
        ]),
      );
    });
    it('Should set context when key is not in context and context exists', () => {
      bindings = bindings.setContextEntry(new ActionContextKey('testEntry'), true);
      expect(bindings.getContext()).toBeDefined();
      expect(bindings.getContext())
        .toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3' ], testEntry: true }));
    });

    it('Should create context with new entry if context does not exist ', () => {
      bindingsNoContext = bindingsNoContext.setContextEntry(new ActionContextKey('testEntry'), true);
      expect(bindingsNoContext.getContext()).toBeDefined();
      expect(bindingsNoContext.getContext()).toEqual(new ActionContext({ testEntry: true }));
    });

    it('Should override context entry when setting existing entry', () => {
      bindings = bindings.setContextEntry(new ActionContextKey('source'), [ 'ex:S1O', 'ex:S2O' ]);
      expect(bindings.getContext()).toBeDefined();
      expect(bindings.getContext()).toEqual(new ActionContext({ source: [ 'ex:S1O', 'ex:S2O' ]}));
    });

    it('Should return correct value', () => {
      const source = bindings.getContextEntry(new ActionContextKey('source'));
      expect(source).toBeDefined();
      expect(source).toEqual([ 'ex:S1', 'ex:S2', 'ex:S3' ]);
    });

    it('Should return undefined when not present', () => {
      const source = bindings.getContextEntry(new ActionContextKey('notPresent'));
      expect(source).toBeUndefined();
    });

    it('Should return undefined when there is no context', () => {
      const source = bindingsNoContext.getContextEntry(new ActionContextKey('source'));
      expect(source).toBeUndefined();
    });

    it('Should delete appropriate context key', () => {
      bindings = bindings.deleteContextEntry(new ActionContextKey('source'));
      expect(bindings.getContext()).toBeDefined();
      expect(bindings.getContext()).toEqual(new ActionContext());
    });

    it('Should work on undefined context', () => {
      bindingsNoContext = bindingsNoContext.deleteContextEntry(new ActionContextKey('source'));
      expect(bindingsNoContext.getContext()).toBeUndefined();
    });
  });

  describe('with context that is merged', () => {
    let bindings: Bindings;
    let bindingsNoContext: Bindings;

    beforeEach(() => {
      bindings = new Bindings(
        DF,
        Map<string, RDF.Term>([
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
          [ 'c', DF.namedNode('ex:c') ],
        ]),
        {
          contextMergeHandlers: { source: new SetUnionBindingsContextMergeHandler() },
          context: new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3' ]}),
        },
      );
      bindingsNoContext = new Bindings(
        DF,
        Map<string, RDF.Term>([
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
          [ 'd', DF.namedNode('ex:d') ],
        ]),
      );
    });

    it('should merge binding context according to mergehandler in mergeWith', () => {
      const bindingsOther = new Bindings(
        DF,
        Map<string, RDF.Term>([
          [ 'd', DF.namedNode('ex:d') ],
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
        ]),
        {
          contextMergeHandlers: { source: new SetUnionBindingsContextMergeHandler() },
          context: new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S5' ]}),
        },
      );
      const bindingsNew: Bindings = bindings.merge(bindingsOther)!;
      expect(bindingsNew).toBeDefined();
      expect(bindingsNew.getContext()).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S5' ]}));
    });

    it('should merge own binding context with extra key by adding to result context without change', () => {
      const bindingsExtraKey = new Bindings(
        DF,
        Map<string, RDF.Term>([
          [ 'd', DF.namedNode('ex:d') ],
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
        ]),
        {
          contextMergeHandlers: { source: new SetUnionBindingsContextMergeHandler() },
          context: new ActionContext({
            source: [ 'ex:S1', 'ex:S2', 'ex:S5' ],
            extraKey: [ 'ex:T1', 'ex:T2' ],
          }),
        },
      );
      const bindingsNew: Bindings = bindingsExtraKey.merge(bindings)!;
      expect(bindingsNew).toBeDefined();
      expect(bindingsNew.getContext())
        .toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S5', 'ex:S3' ], extraKey: [ 'ex:T1', 'ex:T2' ]}));
    });

    it('should merge other binding context with extra key by adding to result context without change', () => {
      const bindingsExtraKey = new Bindings(
        DF,
        Map<string, RDF.Term>([
          [ 'd', DF.namedNode('ex:d') ],
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
        ]),
        {
          contextMergeHandlers: { source: new SetUnionBindingsContextMergeHandler() },
          context: new ActionContext({
            source: [ 'ex:S1', 'ex:S2', 'ex:S5' ],
            extraKey: [ 'ex:T1', 'ex:T2' ],
          }),
        },
      );
      const bindingsNew: Bindings = bindings.merge(bindingsExtraKey)!;
      expect(bindingsNew).toBeDefined();
      expect(bindingsNew.getContext())
        .toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S5' ], extraKey: [ 'ex:T1', 'ex:T2' ]}));
    });

    it(`should merge remove all binding context entries that occur in both contexts but dont have a mergehandler`, () => {
      const bindingsNoMergeHandler = new Bindings(
        DF,
        Map<string, RDF.Term>([
          [ 'd', DF.namedNode('ex:d') ],
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
        ]),
        {
          contextMergeHandlers: {},
          context: new ActionContext({
            source: [ 'ex:S1', 'ex:S2', 'ex:S5' ],
          }),
        },
      );
      const bindingsNew: Bindings = bindingsNoMergeHandler.merge(bindings)!;
      expect(bindingsNew).toBeDefined();
      expect(bindingsNew.getContext()).toEqual(new ActionContext({}));
    });
    it('should merge with itself with context', () => {
      const bindingsNew = bindings.merge(bindings)!;
      expect(bindingsNew).toBeDefined();
      expect(bindingsNew.getContext()).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3' ]}));
    });

    it('should merge overlapping compatible bindings', () => {
      const bindingsOther = new Bindings(
        DF,
        Map<string, RDF.Term>([
          [ 'd', DF.namedNode('ex:d') ],
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
        ]),
        {
          contextMergeHandlers: { source: new SetUnionBindingsContextMergeHandler() },
          context: new ActionContext({
            source: [ 'ex:S1', 'ex:S2', 'ex:S5' ],
          }),
        },
      );

      const cb = jest.fn();
      const bindingsNew: Bindings = bindings.mergeWith(cb, bindingsOther);
      expect(bindingsNew).toBeDefined();
      expect(bindingsNew.getContext()).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S5' ]}));
    });

    it('should merge with only left side merge context', () => {
      const bindingsNew = bindings.merge(bindingsNoContext)!;
      expect(bindingsNew).toBeDefined();
      expect(bindingsNew.getContext()).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3' ]}));
    });

    it('should merge with only right side merge context', () => {
      const bindingsNew = bindingsNoContext.merge(bindings)!;
      expect(bindingsNew).toBeDefined();
      expect(bindingsNew.getContext()).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3' ]}));
    });

    it('should merge with undefined context', () => {
      const bindingsNoContextOther = new Bindings(
        DF,
        Map<string, RDF.Term>([
          [ 'a', DF.namedNode('ex:a') ],
          [ 'b', DF.namedNode('ex:b') ],
          [ 'd', DF.namedNode('ex:d') ],
        ]),
        { contextMergeHandlers: {}},
      );

      const bindingsNew = bindingsNoContext.merge(bindingsNoContextOther)!;
      expect(bindingsNew).toBeDefined();
      expect(bindingsNew.getContext()).toBeUndefined();
    });

    it('should merge with itself with no context', () => {
      const bindingsNew = bindingsNoContext.merge(bindingsNoContext)!;
      expect(bindingsNew).toBeDefined();
      expect(bindingsNew.getContext()).toBeUndefined();
    });

    describe('calling merge twice on same binding should give correct results', () => {
      let bindingsOther1: Bindings;
      let bindingsOther2: Bindings;
      beforeEach(() => {
        bindingsOther1 = new Bindings(
          DF,
          Map<string, RDF.Term>([
            [ 'd', DF.namedNode('ex:d') ],
            [ 'a', DF.namedNode('ex:a') ],
            [ 'b', DF.namedNode('ex:b') ],
          ]),
          {
            contextMergeHandlers: { source: new SetUnionBindingsContextMergeHandler() },
            context: new ActionContext({
              source: [ 'ex:S1', 'ex:S2', 'ex:S5' ],
            }),
          },
        );
        bindingsOther2 = new Bindings(
          DF,
          Map<string, RDF.Term>([
            [ 'd', DF.namedNode('ex:d') ],
            [ 'a', DF.namedNode('ex:a') ],
            [ 'b', DF.namedNode('ex:b') ],
          ]),
          {
            contextMergeHandlers: { source: new SetUnionBindingsContextMergeHandler() },
            context: new ActionContext({
              source: [ 'ex:S2', 'ex:S9' ],
            }),
          },
        );
      });

      it('calling merge twice with different bindings should give correct results', () => {
        const bindingsNew1: Bindings = bindings.merge(bindingsOther1)!;
        expect(bindingsNew1).toBeDefined();
        expect(bindingsNew1.getContext()).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S5' ]}));
        const bindingsNew2: Bindings = bindings.merge(bindingsOther2)!;
        expect(bindingsNew2).toBeDefined();
        expect(bindingsNew2.getContext()).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S9' ]}));
      });

      it('calling mergeWith twice with different bindings should give correct results', () => {
        const cb = jest.fn();
        const bindingsNew1: Bindings = bindings.mergeWith(cb, bindingsOther1);
        expect(bindingsNew1).toBeDefined();
        expect(bindingsNew1.getContext()).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S5' ]}));
        const bindingsNew2: Bindings = bindings.mergeWith(cb, bindingsOther2);
        expect(bindingsNew2).toBeDefined();
        expect(bindingsNew2.getContext()).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S9' ]}));
      });
    });
  });
});
