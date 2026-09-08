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
          entries: [ entry(3, [ 'a' ], pattern()), entry(30, [ 'a' ], FACTORY.createNop()) ],
          context,
        };
        await expect(actor.test(action)).resolves
          .toFailTest(`actor requires the largest entry to be a pattern with a source`);
      });

      it('should reject when the largest entry has no source', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [
            entry(3, [ 'a' ], pattern()),
            entry(30, [ 'a' ], FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.variable('b'))),
          ],
          context,
        };
        await expect(actor.test(action)).resolves
          .toFailTest(`actor requires the largest entry to be a pattern with a source`);
      });

      it('should reject when the largest entry was modified', async() => {
        const entries = [ entry(3, [ 'a' ], pattern()), entry(30, [ 'a' ], pattern()) ];
        entries[1].operationModified = true;
        await expect(actor.test(<any> { type: 'inner', entries, context })).resolves
          .toFailTest(`actor requires the largest entry to be a pattern with a source`);
      });

      it('should accept two patterns and report its coefficients', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [ entry(3, [ 'a' ], pattern()), entry(30, [ 'a' ], pattern()) ],
          context,
        };
        // The entries share ?a, so the join is estimated at the smaller cardinality of 3,
        // and the 3 bindings of the smallest entry are each looked up once.
        await expect(actor.test(action)).resolves.toPassTest({
          iterations: 6,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0,
        });
      });

      it('should bind from the second entry when that one is the smallest', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [ entry(30, [ 'a' ], pattern()), entry(3, [ 'a' ], pattern()) ],
          context,
        };
        await expect(actor.test(action)).resolves.toPassTest({
          iterations: 6,
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
            entry(30, [ 'a' ], pattern(), { pageSize: 100, requestTime: 20 }),
          ],
          context,
        };
        await expect(actor.test(action)).resolves.toPassTest({
          iterations: 6,
          persistedItems: 0,
          blockingItems: 0,
          // 3 bindings, each costing a request of 20, plus 3 pages of the smallest entry and 3 result rows
          requestTime: 3 * (0.1 + 20) + 3 * 0.2,
        });
      });
    });

    describe('getOutput', () => {
      it('should ask the source for the pattern once per binding', async() => {
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [ entry(3, [ 'a' ], pattern()), entry(30, [ 'a' ], pattern()) ],
          context,
        };
        const { result } = await actor.getOutput(action, <any> {
          metadatas: [ metadata(3, [ 'a' ]), metadata(30, [ 'a' ]) ],
          baseIndex: 0,
          patternIndex: 1,
          source,
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

      it('should merge the source context when it has one', async() => {
        const key = new ActionContextKey<string>('mykey');
        source = <any> { source: { queryBindings }, context: new ActionContext().set(key, 'value') };
        const action: IActionRdfJoin = <any> {
          type: 'inner',
          entries: [ entry(3, [ 'a' ], pattern()), entry(30, [ 'a' ], pattern()) ],
          context,
        };
        const { result } = await actor.getOutput(action, <any> {
          metadatas: [ metadata(3, [ 'a' ]), metadata(30, [ 'a' ]) ],
          baseIndex: 0,
          patternIndex: 1,
          source,
        });
        await arrayifyStream(result.bindingsStream);
        expect(queryBindings.mock.calls[0][1].get(key)).toBe('value');
      });
    });
  });
});
