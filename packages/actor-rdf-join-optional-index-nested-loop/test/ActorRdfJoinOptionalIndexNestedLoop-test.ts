import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinSelectivity } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, IJoinEntry, IQuerySourceWrapper, MetadataBindings } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { assignOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { ActorRdfJoinOptionalIndexNestedLoop } from '../lib/ActorRdfJoinOptionalIndexNestedLoop';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);
const BF = new BindingsFactory(DF);

describe('ActorRdfJoinOptionalIndexNestedLoop', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorJoinSelectivity: MediatorRdfJoinSelectivity;
  let mediatorMergeBindingsContext: any;
  let actor: ActorRdfJoinOptionalIndexNestedLoop;
  let store: RdfStore;
  let source: IQuerySourceWrapper;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    mediatorJoinSelectivity = <any> { mediate: async() => ({ selectivity: 0.5 }) };
    mediatorMergeBindingsContext = { mediate: jest.fn(async() => ({})) };
    actor = new ActorRdfJoinOptionalIndexNestedLoop({
      name: 'actor',
      bus,
      mediatorJoinSelectivity,
      mediatorMergeBindingsContext,
      selectivityModifier: 0.1,
    });
    store = RdfStore.createDefault();
    for (const [ s, p, o ] of [
      [ 'ex:review1', 'ex:reviewFor', 'ex:product' ],
      [ 'ex:review2', 'ex:reviewFor', 'ex:product' ],
      [ 'ex:review1', 'ex:rating', 'ex:rating1' ],
    ]) {
      store.addQuad(DF.quad(DF.namedNode(s), DF.namedNode(p), DF.namedNode(o)));
    }
    source = { source: new QuerySourceRdfJs(store, DF, BF) };
  });

  function term(value: string): RDF.Term {
    return value.startsWith('?') ? DF.variable(value.slice(1)) : DF.namedNode(value);
  }

  function pattern(s: string, p: string, o: string, wrapper: IQuerySourceWrapper | null = source): Algebra.Pattern {
    const operation = AF.createPattern(term(s), term(p), term(o));
    return wrapper ? assignOperationSource(operation, wrapper) : operation;
  }

  function metadata(cardinality: number, variables: string[], extra: Partial<MetadataBindings> = {}): MetadataBindings {
    return {
      state: new MetadataValidationState(),
      cardinality: { type: 'exact', value: cardinality },
      variables: variables.map(name => ({ variable: DF.variable(name), canBeUndef: false })),
      ...extra,
    };
  }

  function entry(operation: Algebra.Operation, meta: MetadataBindings): IJoinEntry {
    const op = <Algebra.Pattern> operation;
    return {
      operation,
      output: {
        type: 'bindings',
        bindingsStream: new ArrayIterator(op.subject ?
          store.getBindings(BF, op.subject, op.predicate, op.object, DF.defaultGraph()) :
            [], { autoStart: false }),
        metadata: async() => meta,
      },
    };
  }

  function entries(): IJoinEntry[] {
    return [
      entry(pattern('?review', 'ex:reviewFor', 'ex:product'), metadata(2, [ 'review' ])),
      entry(pattern('?review', 'ex:rating', '?rating'), metadata(1, [ 'review', 'rating' ])),
    ];
  }

  describe('test', () => {
    it('should pass on a local right pattern', async() => {
      await expect(actor.test({ type: 'optional', entries: entries(), context })).resolves.toPassTest({
        iterations: 2 * 1 * 0.5 * 0.1,
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 0,
      });
    });

    it('should not handle inner joins', async() => {
      await expect(actor.test({ type: 'inner', entries: entries(), context })).resolves
        .toFailTest(`actor can only handle logical joins of type 'optional', while 'inner' was given.`);
    });

    it('should only count the request time of the left entry', async() => {
      const joinEntries = entries();
      joinEntries[0] = entry(joinEntries[0].operation, metadata(2, [ 'review' ], { requestTime: 100, pageSize: 10 }));
      joinEntries[1] = entry(joinEntries[1].operation, metadata(1, [ 'review', 'rating' ], { requestTime: 1 }));
      await expect(actor.test({ type: 'optional', entries: joinEntries, context })).resolves.toPassTest({
        iterations: 2 * 1 * 0.5 * 0.1,
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 2 * 100 / 10,
      });
    });

    it('should fail on a right source that can not look up synchronously', async() => {
      const other: IQuerySourceWrapper = <any> {
        source: { getSelectorShape: async() => ({ type: 'operation', operation: { operationType: 'wildcard' }}) },
      };
      const joinEntries = entries();
      joinEntries[1] = entry(pattern('?review', 'ex:rating', '?rating', other), metadata(1, [ 'review', 'rating' ]));
      await expect(actor.test({ type: 'optional', entries: joinEntries, context })).resolves
        .toFailTest(`Actor actor requires a right entry that is an operation over a source that supports synchronous lookups`);
    });

    it('should accept a right entry that is not a pattern if its source accepts it synchronously', async() => {
      const other: IQuerySourceWrapper = <any> {
        source: {
          getSelectorShape: async() => ({
            type: 'operation',
            operation: { operationType: 'wildcard' },
            synchronous: true,
          }),
        },
      };
      const joinEntries = entries();
      joinEntries[1] = entry(
        assignOperationSource(AF.createJoin([ joinEntries[1].operation ]), other),
        metadata(1, [ 'review', 'rating' ]),
      );
      await expect(actor.test({ type: 'optional', entries: joinEntries, context })).resolves.toPassTest({
        iterations: 2 * 1 * 0.5 * 0.1,
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 0,
      });
    });

    it('should fail on a modified right entry', async() => {
      const joinEntries = entries();
      joinEntries[1] = { ...joinEntries[1], operationModified: true };
      await expect(actor.test({ type: 'optional', entries: joinEntries, context })).resolves
        .toFailTest(`Actor actor requires a right entry that is an operation over a source that supports synchronous lookups`);
    });

    it('should fail on a right entry without synchronous lookups', async() => {
      const joinEntries = entries();
      joinEntries[1] = entry(pattern('?review', 'ex:rating', '?rating', null), metadata(1, [ 'review', 'rating' ]));
      await expect(actor.test({ type: 'optional', entries: joinEntries, context })).resolves
        .toFailTest(`Actor actor requires a right entry that is an operation over a source that supports synchronous lookups`);
    });

    it('should fail on a right entry that is an arbitrary length path', async() => {
      const joinEntries = entries();
      const link = assignOperationSource(AF.createLink(DF.namedNode('ex:rating')), source);
      joinEntries[1] = entry(
        AF.createPath(term('?review'), AF.createZeroOrMorePath(link), term('?rating')),
        metadata(1, [ 'review', 'rating' ]),
      );
      await expect(actor.test({ type: 'optional', entries: joinEntries, context })).resolves
        .toFailTest(`Actor actor can not look up arbitrary length paths`);
    });

    it('should fail on join expressions', async() => {
      await expect(actor.test({
        type: 'optional',
        entries: entries(),
        context,
        expression: AF.createTermExpression(DF.literal('true')),
      })).resolves.toFailTest(`actor can not handle join expressions.`);
    });
  });

  describe('run', () => {
    it('should keep left bindings without right results', async() => {
      const joinEntries = entries();
      const action: IActionRdfJoin = { type: 'optional', entries: joinEntries, context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      await expect(result.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('review'), DF.namedNode('ex:review1') ],
          [ DF.variable('rating'), DF.namedNode('ex:rating1') ],
        ]),
        BF.bindings([
          [ DF.variable('review'), DF.namedNode('ex:review2') ],
        ]),
      ]);
      expect(joinEntries[1].output.bindingsStream.done).toBeTruthy();
      expect(mediatorMergeBindingsContext.mediate).not.toHaveBeenCalled();
      await expect(result.metadata()).resolves.toMatchObject({
        cardinality: { type: 'exact', value: 1 },
        variables: [
          { variable: DF.variable('review'), canBeUndef: false },
          { variable: DF.variable('rating'), canBeUndef: true },
        ],
      });
    });

    it('should keep the term order of the left entry', async() => {
      const termOrder = [{ term: DF.variable('review'), direction: <const> 'asc' }];
      const joinEntries = entries();
      joinEntries[0] = entry(
        pattern('?review', 'ex:reviewFor', 'ex:product'),
        metadata(2, [ 'review' ], { termOrder }),
      );
      const action: IActionRdfJoin = { type: 'optional', entries: joinEntries, context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      await expect(result.metadata()).resolves.toMatchObject({ termOrder });
    });

    it('should have no term order if the left entry has none', async() => {
      const action: IActionRdfJoin = { type: 'optional', entries: entries(), context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      expect((await result.metadata()).termOrder).toBeUndefined();
    });

    it('should bind a right entry that is not a pattern', async() => {
      const queryBindingsSynchronous = jest.fn(() => []);
      const other: IQuerySourceWrapper = <any> {
        source: {
          getSelectorShape: async() => ({
            type: 'operation',
            operation: { operationType: 'wildcard' },
            synchronous: true,
          }),
          queryBindingsSynchronous,
        },
      };
      const joinEntries = entries();
      joinEntries[1] = entry(
        assignOperationSource(AF.createJoin([ joinEntries[1].operation ]), other),
        metadata(1, [ 'review', 'rating' ]),
      );
      const action: IActionRdfJoin = { type: 'optional', entries: joinEntries, context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      await expect(result.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('review'), DF.namedNode('ex:review1') ]]),
        BF.bindings([[ DF.variable('review'), DF.namedNode('ex:review2') ]]),
      ]);
      expect(mediatorMergeBindingsContext.mediate).toHaveBeenCalledTimes(1);
      const bound = (<any> queryBindingsSynchronous.mock.calls[0])[0];
      expect(bound.type).toBe('join');
      expect(bound.input[0].subject).toEqual(term('ex:review1'));
    });

    it('should look up within the context of the source', async() => {
      const queryBindingsSynchronous = jest.fn(() => []);
      const contextSource: IQuerySourceWrapper = <any> {
        source: {
          getSelectorShape: async() => ({
            type: 'operation',
            operation: { operationType: 'wildcard' },
            synchronous: true,
          }),
          queryBindingsSynchronous,
        },
        context: new ActionContext({ x: 'y' }),
      };
      const joinEntries = entries();
      joinEntries[1] = entry(pattern('?review', 'ex:rating', '?rating', contextSource), metadata(1, [
        'review',
        'rating',
      ]));
      const action: IActionRdfJoin = { type: 'optional', entries: joinEntries, context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      await expect(result.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('review'), DF.namedNode('ex:review1') ]]),
        BF.bindings([[ DF.variable('review'), DF.namedNode('ex:review2') ]]),
      ]);
      expect(queryBindingsSynchronous)
        .toHaveBeenCalledWith(expect.anything(), context.merge(new ActionContext({ x: 'y' })));
    });
  });
});
