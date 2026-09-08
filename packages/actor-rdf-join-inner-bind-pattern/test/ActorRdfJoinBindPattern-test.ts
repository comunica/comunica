import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, ActionContextKey, Bus } from '@comunica/core';
import type { IActionContext, IQuerySourceWrapper, MetadataBindings } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { assignOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { IBindablePattern } from '../lib/ActorRdfJoinBindPattern';
import { ActorRdfJoinBindPattern } from '../lib/ActorRdfJoinBindPattern';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const FACTORY = new AlgebraFactory();
const mediatorMergeBindingsContext: any = { mediate: () => ({}) };

describe('ActorRdfJoinBindPattern', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  describe('The ActorRdfJoinBindPattern module', () => {
    it('should be a function', () => {
      expect(ActorRdfJoinBindPattern).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfJoinBindPattern constructor', () => {
      expect(new (<any> ActorRdfJoinBindPattern)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfJoinBindPattern);
      expect(new (<any> ActorRdfJoinBindPattern)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfJoin);
    });

    it('should not be able to create new ActorRdfJoinBindPattern objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfJoinBindPattern)();
      }).toThrow(`Class constructor ActorRdfJoinBindPattern cannot be invoked without 'new'`);
    });
  });

  describe('orderPatterns', () => {
    function bindable(cardinality: number, variables: string[], subjectVariable?: string): IBindablePattern {
      return {
        metadata: <any> {
          cardinality: { type: 'estimate', value: cardinality },
          variables: variables.map(variable => ({ variable: DF.variable(variable), canBeUndef: false })),
        },
        cardinality,
        variables,
        subjectVariable,
      };
    }

    it('should take connected patterns with the fewest unbound variables first', () => {
      expect(ActorRdfJoinBindPattern.orderPatterns([ 'a' ], [
        bindable(30, [ 'a', 'b' ], 'a'),
        bindable(5, [ 'b', 'c' ], 'b'),
        bindable(40, [ 'a' ], 'a'),
      ])).toEqual([ 2, 0, 1 ]);
    });

    it('should prefer a pattern whose subject is bound over one bound only in its object', () => {
      expect(ActorRdfJoinBindPattern.orderPatterns([ 'a' ], [
        bindable(10, [ 'b', 'a' ], 'b'),
        bindable(30, [ 'a', 'c' ], 'a'),
      ])).toEqual([ 1, 0 ]);
    });

    it('should break remaining ties by cardinality', () => {
      expect(ActorRdfJoinBindPattern.orderPatterns([ 'a' ], [
        bindable(30, [ 'a', 'b' ], 'a'),
        bindable(10, [ 'a', 'c' ], 'a'),
      ])).toEqual([ 1, 0 ]);
    });

    it('should return undefined when a pattern never connects', () => {
      expect(ActorRdfJoinBindPattern.orderPatterns([ 'a' ], [
        bindable(30, [ 'a', 'b' ], 'a'),
        bindable(10, [ 'c', 'd' ], 'c'),
      ])).toBeUndefined();
    });

    describe('estimateJoined', () => {
      const entering: MetadataBindings = <any> {
        cardinality: { type: 'estimate', value: 2 },
        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      };

      it('should cap a pattern whose subject is bound by the shared variable', () => {
        expect(ActorRdfJoinBindPattern.estimateJoined(entering, bindable(2000, [ 'a', 'b' ], 'a'), new Set([ 'a' ])))
          .toBe(2);
      });

      it('should spread a pattern bound only in its object evenly over the bindings', () => {
        expect(ActorRdfJoinBindPattern.estimateJoined(entering, bindable(2000, [ 'b', 'a' ], 'b'), new Set([ 'a' ])))
          .toBe(2000);
      });

      it('should never estimate below the cap', () => {
        expect(ActorRdfJoinBindPattern.estimateJoined(entering, bindable(1, [ 'b', 'a' ], 'b'), new Set([ 'a' ])))
          .toBe(1);
      });
    });
  });

  describe('An ActorRdfJoinBindPattern instance', () => {
    let actor: ActorRdfJoinBindPattern;
    let source: IQuerySourceWrapper;
    let queryBindings: jest.Mock;

    function metadata(value: number, variables: string[], extra: Record<string, any> = {}): MetadataBindings {
      return <any> {
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value },
        variables: variables.map(variable => ({ variable: DF.variable(variable), canBeUndef: false })),
        ...extra,
      };
    }

    function entry(value: number, variables: string[], operation: any, extra: Record<string, any> = {}): any {
      return {
        output: {
          type: 'bindings',
          bindingsStream: new ArrayIterator<RDF.Bindings>(
            [ BF.bindings([[ DF.variable(variables[0]), DF.namedNode('ex:a') ]]) ],
            { autoStart: false },
          ),
          metadata: async() => metadata(value, variables, extra),
        },
        operation,
      };
    }

    function pattern(): any {
      return assignOperationSource(
        FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.variable('b')),
        source,
      );
    }

    beforeEach(() => {
      queryBindings = jest.fn(() => new ArrayIterator<RDF.Bindings>(
        [ BF.bindings([[ DF.variable('b'), DF.namedNode('ex:b') ]]) ],
        { autoStart: false },
      ));
      source = <any> { source: { queryBindings }, context: undefined };
      actor = new ActorRdfJoinBindPattern({
        name: 'actor',
        bus,
        bindOrder: 'depth-first',
        mediatorJoinSelectivity: <any> { mediate: async() => ({ selectivity: 1 }) },
        mediatorMergeBindingsContext,
      });
    });

    describe('test', () => {
      it('should reject when the largest entry is not a pattern', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [ entry(3, [ 'a' ], pattern()), entry(3000, [ 'a' ], FACTORY.createNop()) ],
          context,
        };
        await expect(actor.test(action)).resolves
          .toFailTest(`actor requires all entries but the smallest to be patterns with a source`);
      });

      it('should reject when the largest entry has no source', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [
            entry(3, [ 'a' ], pattern()),
            entry(3000, [ 'a' ], FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.variable('b'))),
          ],
          context,
        };
        await expect(actor.test(action)).resolves
          .toFailTest(`actor requires all entries but the smallest to be patterns with a source`);
      });

      it('should reject when the largest entry was modified', async() => {
        const entries = [ entry(3, [ 'a' ], pattern()), entry(3000, [ 'a' ], pattern()) ];
        entries[1].operationModified = true;
        await expect(actor.test(<any> { type: 'inner', entries, context })).resolves
          .toFailTest(`actor requires all entries but the smallest to be patterns with a source`);
      });

      it('should accept two patterns and report its coefficients', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [ entry(3, [ 'a' ], pattern()), entry(3000, [ 'a' ], pattern()) ],
          context,
        };
        // The entries share ?a, so the join is estimated at the smaller cardinality of 3,
        // and the 3 bindings of the smallest entry are each looked up once, at the default probe cost of 10.
        await expect(actor.test(action)).resolves.toPassTest({
          iterations: 3 * 11 + 3,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0,
        });
      });

      it('should bind from the second entry when that one is the smallest', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [ entry(3000, [ 'a' ], pattern()), entry(3, [ 'a' ], pattern()) ],
          context,
        };
        await expect(actor.test(action)).resolves.toPassTest({
          iterations: 3 * 11 + 3,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0,
        });
      });

      it('should charge a request per binding over a source that answers in pages', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [
            entry(3, [ 'a' ], pattern(), { pageSize: 100, requestTime: 10 }),
            entry(3000, [ 'a' ], pattern(), { pageSize: 100, requestTime: 20 }),
          ],
          context,
        };
        await expect(actor.test(action)).resolves.toPassTest({
          iterations: 3 * 11 + 3,
          persistedItems: 0,
          blockingItems: 0,
          // 3 pages of the smallest entry, then 3 bindings each costing a request of 20, and 3 result rows
          requestTime: 3 * 0.1 + (3 * 20 + 3 * 0.2),
        });
      });

      it('should accept a smallest entry that is not a pattern', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [ entry(3, [ 'a' ], FACTORY.createNop()), entry(3000, [ 'a' ], pattern()) ],
          context,
        };
        await expect(actor.test(action)).resolves.toPassTest({
          iterations: 3 * 11 + 3,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0,
        });
      });

      it('should reject when a pattern shares no variable with the entries bound before it', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [
            entry(3, [ 'a' ], pattern()),
            entry(3000, [ 'a', 'b' ], pattern()),
            entry(4000, [ 'c' ], pattern()),
          ],
          context,
        };
        await expect(actor.test(action)).resolves
          .toFailTest(`actor requires every pattern to share a variable with the entries bound before it`);
      });

      it('should chain three entries and charge every level', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [
            entry(3, [ 'a' ], pattern()),
            entry(30000, [ 'b', 'c' ], pattern()),
            entry(3000, [ 'a', 'b' ], pattern()),
          ],
          context,
        };
        // The 3 bindings of ?a are looked up in the pattern over ?a ?b first, which yields at most 3 rows,
        // and those are looked up in the pattern over ?b ?c, again yielding at most 3 rows.
        const result = await actor.test(action);
        expect(result.get()).toEqual({
          iterations: 2 * (3 * 11 + 3),
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0,
        });
        expect(result.getSideData().patternIndexes).toEqual([ 2, 1 ]);
      });

      it('should reject when a pattern is cheaper to read once than to bind into', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [ entry(3, [ 'a' ], pattern()), entry(30, [ 'a' ], pattern()) ],
          context,
        };
        await expect(actor.test(action)).resolves
          .toFailTest(`actor would bind into a pattern that is cheaper to read once`);
      });

      it('should reject when a pattern bound only in its object fans out too far', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [
            entry(2, [ 'a' ], pattern()),
            entry(2000, [ 'b', 'a' ], assignOperationSource(
              FACTORY.createPattern(DF.variable('b'), DF.namedNode('ex:p'), DF.variable('a')),
              source,
            )),
          ],
          context,
        };
        await expect(actor.test(action)).resolves
          .toFailTest(`actor would bind into a pattern that is cheaper to read once`);
      });

      it('should bind into a pattern with a constant subject', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [
            entry(3, [ 'a' ], pattern()),
            entry(3000, [ 'a' ], assignOperationSource(
              FACTORY.createPattern(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.variable('a')),
              source,
            )),
          ],
          context,
        };
        await expect(actor.test(action)).resolves.toPassTest({
          iterations: 3 * 11 + 3,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0,
        });
      });

      it('should apply a configured probe cost', async() => {
        actor = new ActorRdfJoinBindPattern({
          name: 'actor',
          bus,
          bindOrder: 'depth-first',
          probeCost: 2,
          mediatorJoinSelectivity: <any> { mediate: async() => ({ selectivity: 1 }) },
          mediatorMergeBindingsContext,
        });
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [ entry(3, [ 'a' ], pattern()), entry(3000, [ 'a' ], pattern()) ],
          context,
        };
        await expect(actor.test(action)).resolves.toPassTest({
          iterations: 3 * 3 + 3,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0,
        });
      });
    });

    describe('getOutput', () => {
      it('should ask the source for the pattern once per binding', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [ entry(3, [ 'a' ], pattern()), entry(3000, [ 'a' ], pattern()) ],
          context,
        };
        const { result } = await actor.getOutput(action, <any> {
          metadatas: [ metadata(3, [ 'a' ]), metadata(3000, [ 'a' ]) ],
          baseIndex: 0,
          patternIndexes: [ 1 ],
          sources: [ source ],
        });
        await expect(arrayifyStream(result.bindingsStream)).resolves.toEqualBindingsArray([
          BF.bindings([
            [ DF.variable('b'), DF.namedNode('ex:b') ],
            [ DF.variable('a'), DF.namedNode('ex:a') ],
          ]),
        ]);
        expect(queryBindings).toHaveBeenCalledTimes(1);
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 3 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        });
      });

      it('should ask each level for its pattern once per binding of the level before it', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [
            entry(3, [ 'a' ], pattern()),
            entry(30000, [ 'b', 'c' ], pattern()),
            entry(3000, [ 'a', 'b' ], pattern()),
          ],
          context,
        };
        const { result } = await actor.getOutput(action, <any> {
          metadatas: [ metadata(3, [ 'a' ]), metadata(30000, [ 'b', 'c' ]), metadata(3000, [ 'a', 'b' ]) ],
          baseIndex: 0,
          patternIndexes: [ 2, 1 ],
          sources: [ source, source ],
        });
        await expect(arrayifyStream(result.bindingsStream)).resolves.toEqualBindingsArray([
          BF.bindings([
            [ DF.variable('b'), DF.namedNode('ex:b') ],
            [ DF.variable('a'), DF.namedNode('ex:a') ],
          ]),
        ]);
        expect(queryBindings).toHaveBeenCalledTimes(2);
        // The first level binds ?a into its pattern, the second binds ?a and the ?b the first produced
        expect(queryBindings.mock.calls[0][0].subject).toEqual(DF.namedNode('ex:a'));
        expect(queryBindings.mock.calls[0][0].object).toEqual(DF.variable('b'));
        expect(queryBindings.mock.calls[1][0].subject).toEqual(DF.namedNode('ex:a'));
        expect(queryBindings.mock.calls[1][0].object).toEqual(DF.namedNode('ex:b'));
      });

      it('should merge the source context when it has one', async() => {
        const key = new ActionContextKey<string>('mykey');
        source = <any> { source: { queryBindings }, context: new ActionContext().set(key, 'value') };
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [ entry(3, [ 'a' ], pattern()), entry(3000, [ 'a' ], pattern()) ],
          context,
        };
        const { result } = await actor.getOutput(action, <any> {
          metadatas: [ metadata(3, [ 'a' ]), metadata(3000, [ 'a' ]) ],
          baseIndex: 0,
          patternIndexes: [ 1 ],
          sources: [ source ],
        });
        await arrayifyStream(result.bindingsStream);
        expect(queryBindings.mock.calls[0][1].get(key)).toBe('value');
      });
    });
  });
});
