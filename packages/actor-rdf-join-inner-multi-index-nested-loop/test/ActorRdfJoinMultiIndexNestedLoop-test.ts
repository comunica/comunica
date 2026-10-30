import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinSelectivity } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type {
  IActionContext,
  IJoinEntry,
  IJoinEntryWithMetadata,
  IQuerySourceWrapper,
  MetadataBindings,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { assignOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import type { IActorRdfJoinMultiIndexNestedLoopTestSideData } from '../lib/ActorRdfJoinMultiIndexNestedLoop';
import { ActorRdfJoinMultiIndexNestedLoop } from '../lib/ActorRdfJoinMultiIndexNestedLoop';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);
const BF = new BindingsFactory(DF);

describe('ActorRdfJoinMultiIndexNestedLoop', () => {
  let bus: any;
  let context: IActionContext;
  let mediatorJoinSelectivity: MediatorRdfJoinSelectivity;
  let mediatorMergeBindingsContext: any;
  let actor: ActorRdfJoinMultiIndexNestedLoop;
  let store: RdfStore;
  let source: IQuerySourceWrapper;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    mediatorJoinSelectivity = <any> { mediate: async() => ({ selectivity: 1 }) };
    mediatorMergeBindingsContext = { mediate: jest.fn(async() => ({})) };
    actor = new ActorRdfJoinMultiIndexNestedLoop({
      name: 'actor',
      bus,
      mediatorJoinSelectivity,
      mediatorMergeBindingsContext,
      lookupCost: 1,
    });
    store = RdfStore.createDefault();
    for (const [ s, p, o ] of [
      [ 'ex:review1', 'ex:reviewFor', 'ex:product' ],
      [ 'ex:review2', 'ex:reviewFor', 'ex:product' ],
      [ 'ex:review1', 'ex:reviewer', 'ex:person1' ],
      [ 'ex:review2', 'ex:reviewer', 'ex:person2' ],
      [ 'ex:person1', 'ex:name', 'ex:name1' ],
    ]) {
      store.addQuad(DF.quad(DF.namedNode(s), DF.namedNode(p), DF.namedNode(o)));
    }
    source = { source: new QuerySourceRdfJs(store, DF, BF) };
  });

  function term(value: string): RDF.Term {
    return value.startsWith('?') ? DF.variable(value.slice(1)) : DF.namedNode(value);
  }

  function pattern(s: string, p: string, o: string, wrapper = source): Algebra.Pattern {
    return assignOperationSource(AF.createPattern(term(s), term(p), term(o)), wrapper);
  }

  function metadata(
    cardinality: number,
    variables: string[],
    extra: Partial<MetadataBindings> = {},
    distinctValues: Record<string, number> = {},
  ): MetadataBindings {
    return {
      state: new MetadataValidationState(),
      cardinality: { type: 'exact', value: cardinality },
      variables: variables.map(name => ({
        variable: DF.variable(name),
        canBeUndef: false,
        ...distinctValues[name] === undefined ? {} : { distinctValues: distinctValues[name] },
      })),
      ...extra,
    };
  }

  function entry(operation: Algebra.Operation, meta: MetadataBindings): IJoinEntry {
    const op = <Algebra.Pattern> (operation.type === 'join' ? (<Algebra.Join> operation).input[0] : operation);
    const bindings = store.getBindings(BF, op.subject, op.predicate, op.object, DF.defaultGraph());
    return {
      operation,
      output: {
        type: 'bindings',
        bindingsStream: new ArrayIterator(bindings, { autoStart: false }),
        metadata: async() => meta,
      },
    };
  }

  function withMetadata(joinEntry: IJoinEntry, meta: MetadataBindings): IJoinEntryWithMetadata {
    return { ...joinEntry, metadata: meta };
  }

  function reviewEntries(): IJoinEntry[] {
    return [
      entry(pattern('?review', 'ex:reviewer', '?reviewer'), metadata(2, [ 'review', 'reviewer' ])),
      entry(pattern('?review', 'ex:reviewFor', 'ex:product'), metadata(2, [ 'review' ])),
      entry(pattern('?reviewer', 'ex:name', '?name'), metadata(1, [ 'reviewer', 'name' ])),
    ];
  }

  describe('estimateFanout', () => {
    it('divides by the distinct values of a bound variable', () => {
      const joinEntry = withMetadata(entry(pattern('?s', 'ex:p', '?o'), metadata(100, [])), metadata(
        100,
        [ 's', 'o' ],
        {},
        { o: 20 },
      ));
      expect(ActorRdfJoinMultiIndexNestedLoop.estimateFanout(joinEntry, new Set([ 'o' ]))).toBe(5);
    });

    it('assumes a bound variable without distinct values to identify a single result', () => {
      const joinEntry = withMetadata(entry(pattern('?s', 'ex:p', '?o'), metadata(100, [])), metadata(
        100,
        [ 's', 'o' ],
      ));
      expect(ActorRdfJoinMultiIndexNestedLoop.estimateFanout(joinEntry, new Set([ 's' ]))).toBe(1);
    });

    it('takes the most selective bound variable', () => {
      const joinEntry = withMetadata(entry(pattern('?s', 'ex:p', '?o'), metadata(100, [])), metadata(
        100,
        [ 's', 'o' ],
        {},
        { s: 50, o: 2 },
      ));
      expect(ActorRdfJoinMultiIndexNestedLoop.estimateFanout(joinEntry, new Set([ 's', 'o' ]))).toBe(2);
    });

    it('returns the cardinality for entries sharing no bound variables', () => {
      const joinEntry = withMetadata(entry(pattern('?s', 'ex:p', '?o'), metadata(100, [])), metadata(
        100,
        [ 's', 'o' ],
      ));
      expect(ActorRdfJoinMultiIndexNestedLoop.estimateFanout(joinEntry, new Set([ 'x' ]))).toBe(100);
    });
  });

  describe('getLookupOrder', () => {
    it('picks the entry with the lowest fanout next', async() => {
      const entries = await Promise.all(reviewEntries()
        .map(async joinEntry => withMetadata(joinEntry, await joinEntry.output.metadata())));
      expect(ActorRdfJoinMultiIndexNestedLoop.getLookupOrder(entries, 1, 1)).toEqual({
        order: [ 0, 2 ],
        iterations: 2 + 2 * (1 + 1) + 2 * (1 + 1),
        cardinality: 2,
      });
    });
  });

  describe('test', () => {
    it('should pass on local pattern entries, starting from the cheapest entry', async() => {
      const action: IActionRdfJoin = { type: 'inner', entries: reviewEntries(), context };
      const result = await actor.test(action);
      expect(result.get()).toEqual({
        iterations: 1 + 1 * (1 + 1) + 1 * (1 + 1),
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 0,
      });
      const sideData: IActorRdfJoinMultiIndexNestedLoopTestSideData = result.getSideData();
      expect(sideData.first).toBe(2);
      expect(sideData.order).toEqual([ 0, 1 ]);
      expect(sideData.cardinality).toBe(1);
    });

    it('should allow a single entry that can not be looked up as first entry', async() => {
      const entries = reviewEntries();
      entries[1] = entry(AF.createJoin([ entries[1].operation ]), await entries[1].output.metadata());
      const result = await actor.test({ type: 'inner', entries, context });
      expect(result.getSideData().first).toBe(1);
      expect(result.getSideData().order).toEqual([ 0, 2 ]);
    });

    it('should fail when two entries can not be looked up', async() => {
      const entries = reviewEntries();
      entries[1] = entry(AF.createJoin([ entries[1].operation ]), await entries[1].output.metadata());
      entries[2] = entry(AF.createJoin([ entries[2].operation ]), await entries[2].output.metadata());
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`Actor actor requires all entries but one to be operations over sources that support synchronous lookups`);
    });

    it('should look up operations other than patterns if their source accepts them synchronously', async() => {
      const other: IQuerySourceWrapper = <any> {
        source: {
          getSelectorShape: async() => ({
            type: 'operation',
            operation: { operationType: 'wildcard' },
            synchronous: true,
          }),
        },
      };
      const entries = reviewEntries();
      entries[1] = entry(
        assignOperationSource(AF.createJoin([ entries[1].operation ]), other),
        await entries[1].output.metadata(),
      );
      entries[2] = entry(
        assignOperationSource(AF.createJoin([ entries[2].operation ]), other),
        await entries[2].output.metadata(),
      );
      await expect(ActorRdfJoinMultiIndexNestedLoop.canLookUp(entries[1], context)).resolves.toBe(true);
      const sideData = (await actor.test({ type: 'inner', entries, context })).getSideData();
      expect(sideData.first).toBe(2);
      expect(sideData.order).toEqual([ 0, 1 ]);
    });

    it('should fail on sources without synchronous lookups', async() => {
      const other: IQuerySourceWrapper = <any> {
        source: { getSelectorShape: async() => ({ type: 'operation', operation: { operationType: 'wildcard' }}) },
      };
      const entries = reviewEntries();
      entries[0] = entry(pattern('?review', 'ex:reviewer', '?reviewer', other), await entries[0].output.metadata());
      entries[2] = entry(pattern('?reviewer', 'ex:name', '?name', other), await entries[2].output.metadata());
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`Actor actor requires all entries but one to be operations over sources that support synchronous lookups`);
    });

    it('should fail on entries without source', async() => {
      const entries = reviewEntries();
      entries[0] = entry(AF.createPattern(term('?review'), term('ex:reviewer'), term('?reviewer')), await entries[0]
        .output.metadata());
      entries[2] = entry(AF.createPattern(term('?reviewer'), term('ex:name'), term('?name')), await entries[2]
        .output.metadata());
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`Actor actor requires all entries but one to be operations over sources that support synchronous lookups`);
    });

    it('should not look up modified operations', async() => {
      const entries = reviewEntries();
      entries[0] = { ...entries[0], operationModified: true };
      entries[2] = { ...entries[2], operationModified: true };
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`Actor actor requires all entries but one to be operations over sources that support synchronous lookups`);
    });

    it('should not start from an entry that requires its operation', async() => {
      const entries = reviewEntries();
      entries[1] = entry(
        AF.createJoin([ entries[1].operation ]),
        metadata(2, [ 'review' ], { operationRequired: true }),
      );
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`actor does not work with operationRequired.`);
      await expect((<any> actor).getJoinCoefficients({ type: 'inner', entries, context }, {
        metadatas: await Promise.all(entries.map(joinEntry => joinEntry.output.metadata())),
      })).resolves.toFailTest(`Actor actor requires all entries but one to be operations over sources that support synchronous lookups`);
    });

    it('should only count the request time of the first entry', async() => {
      const entries = reviewEntries();
      entries[0] = entry(entries[0].operation, metadata(2, [ 'review', 'reviewer' ], { requestTime: 10 }));
      entries[2] = entry(AF.createJoin([ entries[2].operation ]), metadata(1, [ 'reviewer', 'name' ], {
        requestTime: 100,
        pageSize: 10,
      }));
      await expect(actor.test({ type: 'inner', entries, context })).resolves.toPassTest({
        iterations: 1 + 1 * (1 + 1) + 1 * (1 + 1),
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 10,
      });
    });
  });

  describe('run', () => {
    it('should join the first entry with lookups of the others', async() => {
      const entries = reviewEntries();
      const action: IActionRdfJoin = { type: 'inner', entries, context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      await expect(result.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('review'), DF.namedNode('ex:review1') ],
          [ DF.variable('reviewer'), DF.namedNode('ex:person1') ],
          [ DF.variable('name'), DF.namedNode('ex:name1') ],
        ]),
      ]);
      expect(entries[0].output.bindingsStream.done).toBeTruthy();
      expect(entries[2].output.bindingsStream.done).toBeTruthy();
      expect(mediatorMergeBindingsContext.mediate).not.toHaveBeenCalled();
    });

    it('should bind lookups that are not patterns', async() => {
      const queryBindingsSynchronous = jest.fn(() => [
        BF.bindings([[ DF.variable('review'), DF.namedNode('ex:review1') ]]),
      ]);
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
      const entries = reviewEntries();
      entries[1] = entry(
        assignOperationSource(AF.createJoin([ entries[1].operation ]), other),
        await entries[1].output.metadata(),
      );
      const action: IActionRdfJoin = { type: 'inner', entries, context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      await expect(result.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('review'), DF.namedNode('ex:review1') ],
          [ DF.variable('reviewer'), DF.namedNode('ex:person1') ],
          [ DF.variable('name'), DF.namedNode('ex:name1') ],
        ]),
      ]);
      expect(mediatorMergeBindingsContext.mediate).toHaveBeenCalledTimes(1);
      const bound = (<any> queryBindingsSynchronous.mock.calls[0])[0];
      expect(bound.type).toBe('join');
      expect(bound.input[0].subject).toEqual(DF.namedNode('ex:review1'));
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
      const entries = reviewEntries();
      entries[0] = entry(pattern('?review', 'ex:reviewer', '?reviewer', contextSource), metadata(2, [
        'review',
        'reviewer',
      ]));
      const action: IActionRdfJoin = { type: 'inner', entries, context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      await expect(result.bindingsStream).toEqualBindingsStream([]);
      expect(queryBindingsSynchronous)
        .toHaveBeenCalledWith(expect.anything(), context.merge(new ActionContext({ x: 'y' })));
    });

    it('should cap the cardinality by its own estimate', async() => {
      const entries = reviewEntries();
      const action: IActionRdfJoin = { type: 'inner', entries, context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      await expect(result.metadata()).resolves.toMatchObject({ cardinality: { type: 'estimate', value: 1 }});
    });

    it('should keep the term order of the first entry', async() => {
      const termOrder = [{ term: DF.variable('reviewer'), direction: <const> 'asc' }];
      const entries = reviewEntries();
      entries[1] = entry(pattern('?review', 'ex:reviewFor', 'ex:product'), metadata(2, [ 'review' ], {
        termOrder: [{ term: DF.variable('review'), direction: 'asc' }],
      }));
      entries[2] = entry(pattern('?reviewer', 'ex:name', '?name'), metadata(1, [ 'reviewer', 'name' ], { termOrder }));
      const action: IActionRdfJoin = { type: 'inner', entries, context };
      const sideData = (await actor.test(action)).getSideData();
      expect(sideData.first).toBe(2);
      const result = await actor.run(action, sideData);
      await expect(result.metadata()).resolves.toMatchObject({ termOrder });
    });

    it('should have no term order if the first entry has none', async() => {
      const entries = reviewEntries();
      const action: IActionRdfJoin = { type: 'inner', entries, context };
      const result = await actor.run(action, (await actor.test(action)).getSideData());
      expect((await result.metadata()).termOrder).toBeUndefined();
    });

    it('should keep the default cardinality when it is lower', async() => {
      const entries = reviewEntries();
      const action: IActionRdfJoin = { type: 'inner', entries, context };
      const sideData = (await actor.test(action)).getSideData();
      const result = await actor.run(action, <any> { ...sideData, cardinality: 1_000 });
      await expect(result.metadata()).resolves.toMatchObject({ cardinality: { type: 'estimate', value: 2 }});
    });
  });

  describe('with arbitrary length paths', () => {
    function pathOperation(
      subject: string,
      object: string,
      wrapper: IQuerySourceWrapper | null = source,
    ): Algebra.Path {
      let link: Algebra.Operation = AF.createLink(DF.namedNode('ex:reviewer'));
      if (wrapper) {
        link = assignOperationSource(link, wrapper);
      }
      return AF.createPath(term(subject), AF.createOneOrMorePath(AF.createInv(link)), term(object));
    }

    function pathEntry(operation: Algebra.Path, meta: MetadataBindings): IJoinEntry {
      return {
        operation,
        output: {
          type: 'bindings',
          bindingsStream: new ArrayIterator<any>([], { autoStart: false }),
          metadata: async() => meta,
        },
      };
    }

    function reviewerEntries(): IJoinEntry[] {
      return [
        entry(pattern('?person', 'ex:name', '?name'), metadata(1, [ 'person', 'name' ])),
        pathEntry(pathOperation('?person', '?review'), metadata(2, [ 'person', 'review' ])),
      ];
    }

    it('should look up paths of which the predicate can be looked up', async() => {
      const [ , joinEntry ] = reviewerEntries();
      await expect(ActorRdfJoinMultiIndexNestedLoop.canLookUp(joinEntry, context)).resolves.toBe(true);
      expect(ActorRdfJoinMultiIndexNestedLoop.getLookupSource(joinEntry.operation)).toBe(source);
    });

    it('should not look up paths of which the predicate has no source', async() => {
      const joinEntry = pathEntry(pathOperation('?person', '?review', null), metadata(2, [ 'person', 'review' ]));
      await expect(ActorRdfJoinMultiIndexNestedLoop.canLookUp(joinEntry, context)).resolves.toBe(false);
    });

    it('should not look up paths of which the predicate can not be looked up synchronously', async() => {
      const other: IQuerySourceWrapper = <any> {
        source: { getSelectorShape: async() => ({ type: 'operation', operation: { operationType: 'wildcard' }}) },
      };
      const joinEntry = pathEntry(pathOperation('?person', '?review', other), metadata(2, [ 'person', 'review' ]));
      await expect(ActorRdfJoinMultiIndexNestedLoop.canLookUp(joinEntry, context)).resolves.toBe(false);
    });

    it('should only estimate a finite fanout for paths with a bound subject or object', async() => {
      const joinEntry = withMetadata(
        pathEntry(pathOperation('?person', '?review'), metadata(2, [])),
        metadata(2, [ 'person', 'review' ]),
      );
      expect(ActorRdfJoinMultiIndexNestedLoop.estimateFanout(joinEntry, new Set())).toBe(Number.POSITIVE_INFINITY);
      expect(ActorRdfJoinMultiIndexNestedLoop.estimateFanout(joinEntry, new Set([ 'review' ]))).toBe(1);
      const constantEntry = withMetadata(
        pathEntry(pathOperation('ex:person1', '?review'), metadata(1, [])),
        metadata(1, [ 'review' ]),
      );
      expect(ActorRdfJoinMultiIndexNestedLoop.estimateFanout(constantEntry, new Set())).toBe(1);
    });

    it('should fail if a path can not be looked up from a bound term', async() => {
      const entries = [
        entry(AF.createJoin([ pattern('?a', 'ex:name', '?b') ]), metadata(1, [ 'a', 'b' ])),
        pathEntry(pathOperation('?person', '?review'), metadata(2, [ 'person', 'review' ])),
      ];
      await expect(actor.test({ type: 'inner', entries, context })).resolves
        .toFailTest(`Actor actor requires an order in which every path is looked up from a bound term`);
    });

    it('should join the first entry with lookups of a path', async() => {
      const entries = reviewerEntries();
      const action: IActionRdfJoin = { type: 'inner', entries, context };
      const sideData = (await actor.test(action)).getSideData();
      expect(sideData.first).toBe(0);
      expect(sideData.order).toEqual([ 1 ]);
      const result = await actor.run(action, sideData);
      await expect(result.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('person'), DF.namedNode('ex:person1') ],
          [ DF.variable('name'), DF.namedNode('ex:name1') ],
          [ DF.variable('review'), DF.namedNode('ex:review1') ],
        ]),
      ]);
      expect(mediatorMergeBindingsContext.mediate).toHaveBeenCalledTimes(1);
    });
  });
});
